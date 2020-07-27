---
id: channel-client.browserchannelclientinterface
title: BrowserChannelClientInterface interface
hide_title: true
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[@statechannels/channel-client](./channel-client.md) &gt; [BrowserChannelClientInterface](./channel-client.browserchannelclientinterface.md)

## BrowserChannelClientInterface interface

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 


<b>Signature:</b>

```typescript
export interface BrowserChannelClientInterface extends ChannelClientInterface 
```
<b>Extends:</b> [ChannelClientInterface](./channel-client.channelclientinterface.md)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [onBudgetUpdated](./channel-client.browserchannelclientinterface.onbudgetupdated.md) | (callback: (result: DomainBudget) =&gt; void) =&gt; [UnsubscribeFunction](./channel-client.unsubscribefunction.md) | <b><i>(BETA)</i></b> |

## Methods

|  Method | Description |
|  --- | --- |
|  [approveBudgetAndFund(playerAmount, hubAmount, hubAddress, hubOutcomeAddress)](./channel-client.browserchannelclientinterface.approvebudgetandfund.md) | <b><i>(BETA)</i></b> |
|  [closeAndWithdraw(hubParticipantId)](./channel-client.browserchannelclientinterface.closeandwithdraw.md) | <b><i>(BETA)</i></b> |
|  [getBudget(hubAddress)](./channel-client.browserchannelclientinterface.getbudget.md) | <b><i>(BETA)</i></b> |