import * as core from '@actions/core'
import * as github from '@actions/github'

const urlParse =
  /\/(?<ownerType>orgs|users)\/(?<ownerName>[^/]+)\/projects\/(?<projectNumber>\d+)/

interface ProjectNodeIDResponse {
  organization?: {
    projectV2: {
      id: string
    }
  }

  user?: {
    projectV2: {
      id: string
    }
  }
}

interface ProjectV2AddDraftIssueResponse {
  addProjectV2DraftIssue: {
    projectItem: {
      id: string
    }
  }
}

type Issue =
  | {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any
      number: number
      html_url?: string
      body?: string
    }
  | undefined

export async function issueToProjectV2Item(): Promise<string> {
  const projectUrl: string = core.getInput('project-url', { required: true })
  const ghToken: string = core.getInput('github-token', { required: true })

  const octokit = github.getOctokit(ghToken)

  const issue: Issue = github.context.payload.issue

  core.debug(`Project URL: ${projectUrl}`)
  const urlMatch = projectUrl.match(urlParse)
  if (!urlMatch) {
    throw new Error(
      `Invalid project URL: ${projectUrl}. Project URL should match the format <GitHub server domain name>/<orgs-or-users>/<ownerName>/projects/<projectNumber>`
    )
  }

  const projectOwnerName = urlMatch.groups?.ownerName
  const projectNumber = parseInt(urlMatch.groups?.projectNumber ?? '', 10)
  const ownerType = urlMatch.groups?.ownerType
  const ownerTypeQuery = mustGetOwnerTypeQuery(ownerType)

  core.debug(`Project owner: ${projectOwnerName}`)
  core.debug(`Project number: ${projectNumber}`)
  core.debug(`Project owner type: ${ownerType}`)

  // 1. Use the GraphQL API to request the project's node ID.
  const idResp = await octokit.graphql<ProjectNodeIDResponse>(
    `query getProject($projectOwnerName: String!, $projectNumber: Int!) {
            ${ownerTypeQuery}(login: $projectOwnerName) {
                projectV2(number: $projectNumber) {
                    id
                }
            }
        }`,
    {
      projectOwnerName,
      projectNumber
    }
  )

  const projectId = idResp[ownerTypeQuery]?.projectV2.id
  const contentId = issue?.node_id

  core.debug(`Project node ID: ${projectId}`)
  core.debug(`Content ID: ${contentId}`)

  // 2. Create drafted issue in project
  const itemTitle = issue?.title ?? 'Unknown Issue'
  const itemBody = generateDefaultIssueBody(issue)

  const createdProjectItem =
    await octokit.graphql<ProjectV2AddDraftIssueResponse>(
      `mutation createDraftIssue($projectId: ID!, $itemTitle: String!, $itemBody: String!) {
            addProjectV2DraftIssue(input: {
                projectId: $projectId,
                    title: $itemTitle,
                    body: $itemBody
            }) {
                projectItem {
                    id
                }
            }
        }`,
      {
        projectId,
        itemTitle,
        itemBody
      }
    )

  return createdProjectItem.addProjectV2DraftIssue.projectItem.id
}

function mustGetOwnerTypeQuery(ownerType?: string): 'organization' | 'user' {
  const ownerTypeQuery =
    ownerType === 'orgs'
      ? 'organization'
      : ownerType === 'users'
      ? 'user'
      : null

  if (!ownerTypeQuery) {
    throw new Error(
      `Unsupported ownerType: ${ownerType}. Must be one of 'orgs' or 'users'`
    )
  }

  return ownerTypeQuery
}

function generateDefaultIssueBody(issue: Issue): string {
  const issueRef = `> [Original Issue](${issue?.html_url})`
  const descriptionHeader = '## Description'
  const descriptionPlaceholder = '_Add the issue description here_\n'
  const tasksHeader = '## Tasks'
  const tasksPlaceholder = '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n\n'
  const divider = '---'
  const originalDescription = '## Original Description\n'
  const issueBody = issue?.body
  return [
    issueRef,
    descriptionHeader,
    descriptionPlaceholder,
    tasksHeader,
    tasksPlaceholder,
    divider,
    originalDescription,
    issueBody
  ].join('\n')
}
