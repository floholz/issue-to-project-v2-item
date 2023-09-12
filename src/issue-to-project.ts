import * as core from "@actions/core";
import * as github from '@actions/github';


const urlParse = /\/(?<ownerType>orgs|users)\/(?<ownerName>[^/]+)\/projects\/(?<projectNumber>\d+)/;

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

interface ProjectAddItemResponse {
    addProjectV2ItemById: {
        item: {
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


export async function issueToProjectV2Item(): Promise<string> {
    const projectUrl = core.getInput('project-url', {required: true});
    const ghToken = core.getInput('github-token', {required: true});

    const octokit = github.getOctokit(ghToken);

    const issue = github.context.payload.issue;
    const issueLabels: string[] = (issue?.labels ?? []).map((l: {name: string}) => l.name.toLowerCase());
    const issueOwnerName = github.context.payload.repository?.owner.login;


    core.debug(`Project URL: ${projectUrl}`);
    const urlMatch = projectUrl.match(urlParse);
    if (!urlMatch) {
        throw new Error(
            `Invalid project URL: ${projectUrl}. Project URL should match the format <GitHub server domain name>/<orgs-or-users>/<ownerName>/projects/<projectNumber>`,
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
            projectNumber,
        },
    );

    const projectId = idResp[ownerTypeQuery]?.projectV2.id;
    const contentId = issue?.node_id;

    core.debug(`Project node ID: ${projectId}`);
    core.debug(`Content ID: ${contentId}`);


    // 2. Create drafted issue in project
    const itemTitle = issue?.title ?? 'Unknown Issue';
    const itemBody = ''; // todo: generate issue url + append issue.body

    const createdProjectItem = await octokit.graphql<ProjectV2AddDraftIssueResponse>(
        `mutation createDraftIssue($projectId: String!, $itemTitle: String!, $itemBody: String!) {
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
    );

    return createdProjectItem.addProjectV2DraftIssue.projectItem.id;
}


function mustGetOwnerTypeQuery(ownerType?: string): 'organization' | 'user' {
    const ownerTypeQuery = ownerType === 'orgs' ? 'organization' : ownerType === 'users' ? 'user' : null

    if (!ownerTypeQuery) {
        throw new Error(`Unsupported ownerType: ${ownerType}. Must be one of 'orgs' or 'users'`)
    }

    return ownerTypeQuery
}


