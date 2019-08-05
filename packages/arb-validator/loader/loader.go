/*
 * Copyright 2019, Offchain Labs, Inc.
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

package loader

import (
	"fmt"
	"github.com/offchainlabs/arb-validator/testmachine"
	"strings"

	"github.com/offchainlabs/arb-util/machine"

	"github.com/offchainlabs/arb-avm/goloader"

	"github.com/offchainlabs/arb-avm-cpp/cmachine"
)

func LoadMachineFromFile(fileName string, warnMode bool, vmtype string) (machine.Machine, error) {
	if strings.EqualFold(vmtype, "go") {
		return goloader.LoadMachineFromFile(fileName, warnMode)
	} else if strings.EqualFold(vmtype, "cpp") {
		ret := cmachine.New(fileName)
		return ret, nil
	} else if strings.EqualFold(vmtype, "test") {
		return testmachine.New(fileName, warnMode)
	} else {
		return nil, fmt.Errorf("Invalid machine type specified %v", vmtype)
	}
}