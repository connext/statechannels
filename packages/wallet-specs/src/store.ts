import { add, getChannelId, gt, SignedState } from '.';
import { ChannelStoreEntry, IChannelStoreEntry } from './ChannelStoreEntry';
import { messageService } from './messaging';
import { AddressableMessage, FundingStrategyProposed } from './wire-protocol';
import { State } from '@statechannels/nitro-protocol';
import { getStateSignerAddress, signState } from '@statechannels/nitro-protocol/lib/src/signatures';
export interface IStore {
  getEntry: (channelId: string) => ChannelStoreEntry;
  getIndex: (channelId: string) => 0 | 1;

  // The channel store should garbage collect stale states on CHANNEL_UPDATED events.
  // If a greater state becomes supported on such an event, it should replace the latest
  // supported state, and remove any lesser, unsupported states.
  getUnsupportedStates: (channelId: string) => SignedState[];

  findLedgerChannelId: (participants: string[]) => string | undefined;
  signedByMe: (state: State) => boolean;
  getPrivateKey: (participantIds: string[]) => string;

  /*
  Store modifiers
  */
  initializeChannel: (entry: ChannelStoreEntry) => void;
  sendState: (state: State) => void;
  sendOpenChannel: (state: State) => void;
  receiveStates: (signedStates: SignedState[]) => void;

  // TODO: set funding
  // setFunding(channelId: string, funding: Funding): void;

  getNextNonce(participants: string[]): string;
  useNonce(participants: string[], nonce): void;
  nonceOk(participants: string[], nonce: string): boolean;
}

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}
export interface ChannelStore {
  [channelId: string]: IChannelStoreEntry;
}

export type Constructor = Partial<{
  store: ChannelStore;
  privateKeys: Record<string, string>;
  nonces: Record<string, string>;
}>;
export class Store implements IStore {
  public static equals(left: any, right: any) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private _store: ChannelStore;
  private _privateKeys: Record<string, string>;
  private _nonces: Record<string, string> = {};

  constructor(args?: Constructor) {
    const { store, privateKeys } = args || {};
    this._store = store || {};
    this._privateKeys = privateKeys || {};
  }

  public getEntry(channelId: string): ChannelStoreEntry {
    if (!this._store[channelId]) {
      throw new Error(`Channel ${channelId} not found`);
    }

    return new ChannelStoreEntry(this._store[channelId]);
  }

  public maybeGetEntry(channelId: string): ChannelStoreEntry | false {
    const entry = this._store[channelId];
    return !!entry && new ChannelStoreEntry(entry);
  }

  public getPrivateKey(participantIds: string[]): string {
    const myId = participantIds.find(id => this._privateKeys[id]);
    if (!myId) {
      throw new Error(`No private key found for ${myId}`);
    }
    return this._privateKeys[myId];
  }

  public getIndex(channelId: string): 0 | 1 {
    const entry = this.getEntry(channelId);
    const { participants } = entry.states[0].state.channel;
    if (participants.length !== 2) {
      throw new Error('Assumes two participants');
    }

    const ourAddress = `addressFrom${entry.privateKey}`;
    return participants.indexOf(ourAddress) as 0 | 1;
  }

  public findLedgerChannelId(participantIds: string[]): string | undefined {
    for (const channelId in this._store) {
      const entry = this.getEntry(channelId);
      if (
        entry.latestSupportedState.appDefinition === undefined &&
        // TODO: correct array equality
        this.participantIds(channelId) === participantIds
      ) {
        return channelId;
      }
    }
    return undefined;
  }

  public participantIds(channelId: string): string[] {
    return this.getEntry(channelId).participants.map(p => p.participantId);
  }

  public getUnsupportedStates(channelId: string) {
    return this.getEntry(channelId).unsupportedStates;
  }

  public signedByMe(state: State) {
    const { states, ourAddress } = this.getEntry(getChannelId(state.channel));
    const signedState = states.find((s: SignedState) => Store.equals(state, s.state));

    return !!signedState?.signatures.find(
      signature => getStateSignerAddress({ ...signedState, signature }) === ourAddress
    );
  }

  public initializeChannel(data: IChannelStoreEntry) {
    const entry = new ChannelStoreEntry(data);
    if (this._store[entry.channelId]) {
      throw new Error(`Channel ${JSON.stringify(entry.channel)} already initialized`);
    }

    const { participants, channelNonce } = entry.channel;
    if (this.nonceOk(participants, channelNonce)) {
      this._store[entry.channelId] = entry.args;
      this.useNonce(participants, channelNonce);
    } else {
      throw new Error('Nonce used for these participants');
    }
  }

  public sendState(state: State) {
    // 1. Check if it's safe to send the state
    // TODO
    const channelId = getChannelId(state.channel);

    // 2. Sign & store the state
    const signedStates: SignedState[] = [this.signState(state)];
    this.updateOrCreateEntry(channelId, signedStates);

    // 3. Send the message
    const message: AddressableMessage = {
      type: 'SendStates',
      signedStates,
      to: 'BLANK',
    };
    this.sendMessage(message, this.recipients(state));
  }

  public sendOpenChannel(state: State) {
    // 1. Check if it's safe to send the state
    // TODO
    const channelId = getChannelId(state.channel);

    // 2. Sign & store the state
    const signedState: SignedState = this.signState(state);
    const newEntry = this.updateOrCreateEntry(channelId, [signedState]);

    // 3. Send the message
    const message: AddressableMessage = {
      type: 'OPEN_CHANNEL',
      signedState,
      to: 'BLANK',
    };

    this.sendMessage(message, newEntry.recipients);
  }

  public sendStrategyChoice(message: FundingStrategyProposed) {
    const { recipients } = this.getEntry(message.targetChannelId);
    this.sendMessage(message, recipients);
  }

  private recipients(state: State): string[] {
    const privateKey = this.getPrivateKey(state.channel.participants);
    return state.channel.participants.filter(p => p !== privateKey);
  }

  private sendMessage(message: any, recipients: string[]) {
    recipients.forEach(to => messageService.sendMessage({ ...message, to }));
  }

  public receiveStates(signedStates: SignedState[]): void {
    try {
      const { channel } = signedStates[0].state;
      const channelId = getChannelId(channel);

      // TODO: validate transition
      this.updateOrCreateEntry(channelId, signedStates);
    } catch (e) {
      throw e;
    }
  }

  // Nonce management

  private key(participants: string[]): string {
    return JSON.stringify(participants);
  }

  public getNextNonce(participants: string[]): string {
    return add(1, this._nonces[this.key(participants)]);
  }

  public useNonce(participants: string[], nonce: string): boolean {
    if (this.nonceOk(participants, nonce)) {
      this._nonces[this.key(participants)] = nonce;
      return true;
    } else {
      throw new Error("Can't use this nonce");
    }
  }

  public nonceOk(participants: string[], nonce: string): boolean {
    return gt(nonce, this._nonces[this.key(participants)] || -1);
  }
  // PRIVATE

  private signState(state: State): SignedState {
    const { privateKey } = this.getEntry(getChannelId(state.channel));

    return {
      state,
      signatures: [signState(state, privateKey).signature],
    };
  }

  private updateOrCreateEntry(channelId: string, states: SignedState[]): ChannelStoreEntry {
    // TODO: This currently assumes that support comes from consensus on a single state
    const entry = this.maybeGetEntry(channelId);
    if (entry) {
      states = merge(states, entry.states);
      this._store[channelId] = { ...this._store[channelId], states };
    } else {
      const { participants, channelNonce } = states[0].state.channel;
      this.useNonce(participants, channelNonce);

      const { channel } = states[0].state;
      const entryParticipants: Participant[] = participants.map(p => ({
        destination: p,
        signingAddress: p,
        participantId: p,
      }));
      const privateKey = this.getPrivateKey(participants);
      this._store[channelId] = {
        states,
        privateKey,
        participants: entryParticipants,
        channel,
      };
    }

    return new ChannelStoreEntry(this._store[channelId]);
  }
}

export function merge(left: SignedState[], right: SignedState[]): SignedState[] {
  // TODO this is horribly inefficient
  right.map(rightState => {
    const idx = left.findIndex(s => Store.equals(s.state, rightState.state));
    const leftState = left[idx];
    if (leftState) {
      const signatures = [...new Set(leftState.signatures.concat(rightState.signatures))];
      left[idx] = { ...leftState, signatures };
    } else {
      left.push(rightState);
    }
  });

  return left;
}

// The store would send this action whenever the channel is updated
export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  channelId: string;
}

export interface Deposit {
  type: 'DEPOSIT';
  channelId: string;
  currentAmount: number;
}

export type StoreEvent = ChannelUpdated | Deposit;