/*
 * Copyright 2020, Offchain Labs, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-env node, mocha */

import { ethers } from '@nomiclabs/buidler'
import { utils } from 'ethers'
import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { OneStepProofTester } from '../build/types/OneStepProofTester'
import { BufferProofTester } from '../build/types/BufferProofTester'
import * as fs from 'fs'

use(chaiAsPromised)

interface Assertion {
  NumGas: number
  BeforeMachineHash: number[]
  AfterMachineHash: number[]
  BeforeInboxHash: number[]
  AfterInboxHash: number[]
  FirstMessageHash: number[]
  LastMessageHash: number[]
  FirstLogHash: number[]
  LastLogHash: number[]
}

interface Proof {
  Assertion: Assertion
  Proof: string
  BufferProof: string
}

let ospTester: OneStepProofTester
let ospTester2: BufferProofTester

async function executeStep(proof: Proof) {
  const proofData = Buffer.from(proof.Proof, 'base64')
  const bufferProofData = Buffer.from(proof.BufferProof || '', 'base64')
  return bufferProofData.length == 0
    ? await ospTester.executeStep(
        proof.Assertion.AfterInboxHash,
        proof.Assertion.FirstMessageHash,
        proof.Assertion.FirstLogHash,
        proofData
      )
    : await ospTester2.executeStep(
        proof.Assertion.AfterInboxHash,
        proof.Assertion.FirstMessageHash,
        proof.Assertion.FirstLogHash,
        proofData,
        bufferProofData
      )
}

async function executeTestStep(proof: Proof) {
  const proofData = Buffer.from(proof.Proof, 'base64')
  const bufferProofData = Buffer.from(proof.BufferProof || '', 'base64')
  return bufferProofData.length == 0
    ? await ospTester.executeStepTest(
        proof.Assertion.AfterInboxHash,
        proof.Assertion.FirstMessageHash,
        proof.Assertion.FirstLogHash,
        proofData
      )
    : await ospTester2.executeStepTest(
        proof.Assertion.AfterInboxHash,
        proof.Assertion.FirstMessageHash,
        proof.Assertion.FirstLogHash,
        proofData,
        bufferProofData
      )
}

describe('OneStepProof', function () {
  before(async () => {
    const OneStepProof = await ethers.getContractFactory('OneStepProofTester')
    ospTester = (await OneStepProof.deploy()) as OneStepProofTester
    await ospTester.deployed()

    const BufferProof = await ethers.getContractFactory('BufferProofTester')
    ospTester2 = (await BufferProof.deploy()) as BufferProofTester
    await ospTester2.deployed()
  })
  const files = fs.readdirSync('./test/proofs')
  for (const filename of files) {
    const file = fs.readFileSync('./test/proofs/' + filename)
    const data = JSON.parse(file.toString()) as Proof[]
    it(`should handle proofs from ${filename}`, async function () {
      this.timeout(60000)

      for (const proof of data.slice(0, 50)) {
        const proofData = Buffer.from(proof.Proof, 'base64')
        const opcode = proofData[proofData.length - 1]
        if (opcode == 131) {
          // Skip too expensive opcode
          continue
        }
        const { fields, gas } = await executeStep(proof)
        // console.log("opcode", opcode, fields)
        expect(fields[0]).to.equal(
          utils.hexlify(proof.Assertion.BeforeMachineHash)
        )
        expect(fields[1]).to.equal(
          utils.hexlify(proof.Assertion.AfterMachineHash)
        )
        expect(fields[2]).to.equal(
          utils.hexlify(proof.Assertion.AfterInboxHash)
        )
        expect(fields[3]).to.equal(utils.hexlify(proof.Assertion.LastLogHash))
        expect(fields[4]).to.equal(
          utils.hexlify(proof.Assertion.LastMessageHash)
        )
        expect(gas).to.equal(proof.Assertion.NumGas)
      }
    })

    it(`efficiently run proofs from ${filename} [ @skip-on-coverage ]`, async function () {
      this.timeout(60000)

      for (const proof of data.slice(0, 25)) {
        const proofData = Buffer.from(proof.Proof, 'base64')
        const opcode = proofData[proofData.length - 1]
        const tx = await executeTestStep(proof)
        const receipt = await tx.wait()
        const gas = receipt.gasUsed!.toNumber()
        if (gas > 1000000) {
          console.log(`opcode ${opcode} used ${gas} gas`)
        }
        expect(gas).to.be.lessThan(5000000)
      }
    })
  }
})
