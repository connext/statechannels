import { AppData, RoundProposed, RoundAccepted, Reveal, Start } from './app-data';

export type ChannelStatus = 'proposed' | 'opening' | 'funding' | 'running' | 'closing' | 'closed';

export interface ChannelState<T = AppData> {
  channelId: string;
  turnNum: string;
  status: ChannelStatus;
  aUserId: string;
  bUserId: string;
  aDestination: string;
  bDestination: string;
  aBal: string;
  bBal: string;
  appData: T;
}

export type MaybeChannelState = ChannelState | null;

export const isClosed = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'closed') || false;

export const isEmpty = (state: MaybeChannelState): state is null => !state;

export const inChannelProposed = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'proposed') || false;

export const isRunning = (state: MaybeChannelState): state is ChannelState =>
  (state && state.status === 'running') || false;

export const inRoundProposed = (state: MaybeChannelState): state is ChannelState<RoundProposed> =>
  (state && state.appData.type === 'roundProposed') || false;

export const inRoundAccepted = (state: MaybeChannelState): state is ChannelState<RoundAccepted> =>
  (state && state.appData.type === 'roundAccepted') || false;

export const inReveal = (state: MaybeChannelState): state is ChannelState<Reveal> =>
  (state && state.appData.type === 'reveal') || false;

export const inStart = (state: MaybeChannelState): state is ChannelState<Start> =>
  (state && state.appData.type === 'start') || false;
