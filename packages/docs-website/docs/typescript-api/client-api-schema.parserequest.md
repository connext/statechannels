---
id: client-api-schema.parserequest
title: parseRequest() function
hide_title: true
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[@statechannels/client-api-schema](./client-api-schema.md) &gt; [parseRequest](./client-api-schema.parserequest.md)

## parseRequest() function

Validates a request against the API schema &amp; returns the input cast to the correctly narrowed type.

<b>Signature:</b>

```typescript
export declare function parseRequest(jsonBlob: object): StateChannelsRequest;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  jsonBlob | object | A javascript object that might be a valid [StateChannelsRequest](./client-api-schema.statechannelsrequest.md) |

<b>Returns:</b>

[StateChannelsRequest](./client-api-schema.statechannelsrequest.md)

The input, but with the correct type, if it is valid.