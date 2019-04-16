import { storiesOf } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

import * as scenarios from './scenarios';
import { TransactionSubmission } from '..';
import StatusBarLayout from '../../../../components/status-bar-layout';
import Modal from 'react-modal';

const fakeStore = state => ({
  dispatch: action => {
    alert(`Action ${action.type} triggered`);
    return action;
  },
  getState: () => state,
  subscribe: () => () => {
    /* empty */
  },
  replaceReducer: () => {
    /* empty */
  },
});

const render = container => () => {
  // todo: rework this modal stuff
  return (
    <Provider store={fakeStore({})}>
      <Modal
        isOpen={true}
        className={'wallet-content-center'}
        overlayClassName={'wallet-overlay-center'}
        ariaHideApp={false}
      >
        <StatusBarLayout>{container}</StatusBarLayout>
      </Modal>
    </Provider>
  );
};

const happyPathStories = {
  WaitForSend: scenarios.happyPath.waitForSend,
  WaitForSubmission: scenarios.happyPath.waitForSubmission,
  WaitForConfirmation: scenarios.happyPath.waitForConfirmation,
  Success: scenarios.happyPath.success,
};

const retryAndApprove = {
  WaitForSubmission: scenarios.retryAndApprove.waitForSubmission,
  ApproveRetry: scenarios.retryAndApprove.approveRetry,
  WaitForSend: scenarios.retryAndApprove.waitForSend2,
};

const retryAndDeny = {
  WaitForSubmission: scenarios.retryAndDeny.waitForSubmission,
  ApproveRetry: scenarios.retryAndDeny.approveRetry,
  WaitForSend: scenarios.retryAndDeny.failure,
};

const transactionFails = {
  WaitForConfirmation: scenarios.transactionFailed.waitForConfirmation,
  Failure: scenarios.transactionFailed.failure2,
};

addStories(happyPathStories, 'Transaction Submission / Happy path');
addStories(retryAndApprove, 'Transaction Submission / User approves retry');
addStories(retryAndDeny, 'Transaction Submission / User denies retry');
addStories(transactionFails, 'Transaction Submission / Transaction fails');

function addStories(collection, chapter) {
  Object.keys(collection).map(storyName => {
    const state = collection[storyName];
    storiesOf(chapter, module).add(storyName, render(<TransactionSubmission state={state} />));
  });
}
