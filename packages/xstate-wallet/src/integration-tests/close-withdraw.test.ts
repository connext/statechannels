import {FakeChain} from '../chain';
import {Player, hookUpMessaging, generateCloseAndWithdrawRequest} from './helpers';
import {CloseAndWithdrawResponse} from '@statechannels/client-api-schema';
import {filter, map, first} from 'rxjs/operators';

import {CHALLENGE_DURATION} from '../constants';
import {simpleEthAllocation} from '../utils/outcome';
import {bigNumberify} from 'ethers/utils';
import {isCloseLedger, CloseLedger} from '../store/types';
import waitForExpect from 'wait-for-expect';
jest.setTimeout(30000);

it('allows for a wallet to close the ledger channel with the hub and withdraw', async () => {
  const fakeChain = new FakeChain();

  const playerA = new Player(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );

  const hub = new Player(
    '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29',
    'Hub',
    fakeChain
  );
  const outcome = simpleEthAllocation([
    {amount: bigNumberify(6), destination: playerA.destination},
    {amount: bigNumberify(4), destination: hub.destination}
  ]);
  hookUpMessaging(playerA, hub);

  const ledgerChannel = await playerA.store.createChannel([playerA, hub], CHALLENGE_DURATION, {
    outcome,
    turnNum: bigNumberify(20),
    isFinal: false,
    appData: '0x0'
  });

  await playerA.store.setLedger(ledgerChannel.channelId);

  await hub.store.setLedger(ledgerChannel.channelId);
  await hub.store.signAndAddState(ledgerChannel.channelId, ledgerChannel.latest);
  await playerA.store.chain.deposit(ledgerChannel.channelId, '0x0', '0x10');

  hub.store.objectiveFeed.pipe(filter(o => isCloseLedger(o))).subscribe(async o => {
    hub.startCloseLedgerAndWithdraw({
      player: hub.participant,
      opponent: playerA.participant,
      requestId: 134556607,
      ledgerId: (o as CloseLedger).data.ledgerId
    });
  });

  const closeAndWithdrawMessage = generateCloseAndWithdrawRequest(
    playerA.participant,
    hub.participant
  );
  const closeAndWithdrawPromise = playerA.messagingService.outboxFeed
    .pipe(
      filter(m => 'id' in m && m.id === closeAndWithdrawMessage.id),
      map(m => m as CloseAndWithdrawResponse),
      first()
    )
    .toPromise();
  await playerA.messagingService.receiveRequest(closeAndWithdrawMessage);

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('waitForUserApproval');
  }, 3000);
  playerA.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES_CLOSE'});
  await waitForExpect(async () => {
    expect(hub.workflowState).toEqual('waitForUserApproval');
  }, 3000);
  hub.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES_CLOSE'});

  const closeAndWithdrawResponse: CloseAndWithdrawResponse = await closeAndWithdrawPromise;

  // Verify the response is correct
  expect(closeAndWithdrawResponse.result.success).toBe(true);

  // Verify that the blockchain is correct
  const chainView = await playerA.store.chain.getChainInfo(ledgerChannel.channelId);
  expect(chainView.finalized).toBe(true);
  expect(chainView.amount.eq(0)).toBe(true);

  // Check the channel is finalized
  const latestEntry = playerA.store.getEntry(ledgerChannel.channelId);
  expect((await latestEntry).isFinalized).toBe(true);
});