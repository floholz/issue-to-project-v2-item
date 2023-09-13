import * as core from '@actions/core'
import { issueToProjectV2Item } from './issue-to-project'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const projectV2ItemId = await issueToProjectV2Item()
    // Set outputs for other workflow steps to use
    core.setOutput('project-v2-item-id', projectV2ItemId)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
