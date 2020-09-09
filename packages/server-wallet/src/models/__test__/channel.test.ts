import Knex from 'knex';

import {Channel, ChannelError} from '../channel';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {extractDBConfigFromServerWalletConfig, defaultConfig} from '../../config';
import {stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';

import {channel} from './fixtures/channel';

const knex: Knex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

beforeEach(async () => seedAlicesSigningWallet(knex));

it('can insert Channel instances to, and fetch them from, the database', async () => {
  const vars = [stateWithHashSignedBy()()];
  const c1 = channel({channelNonce: 1234, vars});

  await Channel.query(knex)
    .withGraphFetched('signingWallet')
    .insert(c1);

  expect(c1.signingWallet).toBeDefined();

  const c2 = await Channel.query(knex)
    .where({channel_nonce: 1234})
    .first();

  expect(c1.vars).toMatchObject(c2.vars);
});

it('can insert multiple channels instances within a transaction', async () => {
  const vars = [stateWithHashSignedBy()()];
  const c1 = channel({vars});
  const c2 = channel({channelNonce: 1234, vars});

  await Channel.transaction(async tx => {
    await Channel.query(knex).insert(c1);

    expect(await Channel.query(knex).select()).toHaveLength(1);

    await Channel.query(knex).insert(c2);
    expect(await Channel.query(knex).select()).toHaveLength(2);

    // You can query the DB outside of this transaction,
    // where the channels have not yet been committed
    expect(await Channel.query(knex).select()).toHaveLength(0);
  });

  // The transaction has been committed. Two channels were stored.
  expect(await Channel.query(knex).select()).toHaveLength(2);
});

describe('validation', () => {
  it('throws when inserting a model where the channelId is inconsistent', () =>
    expect(
      Channel.query(knex).insert({
        ...channel({vars: [stateWithHashSignedBy()()]}),
        channelId: 'wrongId',
      })
    ).rejects.toThrow(ChannelError.reasons.invalidChannelId));
});
