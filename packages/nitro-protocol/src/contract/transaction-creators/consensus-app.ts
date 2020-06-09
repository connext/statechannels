import {providers, utils} from 'ethers';
import ConsensusAppArtifact from '../../../build/contracts/ConsensusApp.json';
import {getVariablePart} from '../consensus-app';
import {ConsensusData} from '../consensus-data';
import {Outcome} from '../outcome';

const ConsensusAppContractInterface = new utils.Interface(ConsensusAppArtifact.abi);

export function createValidTransitionTransaction(
  fromConsensusData: ConsensusData,
  fromOutcome: Outcome,
  toConsensusData: ConsensusData,
  toOutcome: Outcome,
  numberOfParticipants: number
): providers.TransactionRequest {
  const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  const turnNumB = 0; // This isn't actually used by the contract so any value works
  const data = ConsensusAppContractInterface.encodeFunctionData(
    ConsensusAppContractInterface.functions.validTransition,
    [fromVariablePart, toVariablePart, turnNumB, numberOfParticipants]
  );

  return {data};
}
