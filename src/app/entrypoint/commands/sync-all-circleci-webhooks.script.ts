#!/usr/bin/env node

import yargs from "yargs"
import {hideBin} from "yargs/helpers"
import * as circleciService from "../../../services/circleci.service";
import env from "../../../common/env";

const argv: any = yargs(hideBin(process.argv)).argv

const execute = async () => {
    if(!argv.webhook) throw new Error("Webhook is required");
    //get all projects
    const projectsResponse = await circleciService.getProjectByName(argv.project);

    // console.log("project response", projectsResponse);

    if(projectsResponse.error) throw new Error(projectsResponse.error);

    for(let project of projectsResponse.data){
        console.log("project.username !== env.circleciOrg", project.username, env.circleciOrg);

        if(project.username !== env.circleciOrg) continue;

        await processWebhook(project, argv);
    }
    process.exit(0);
};


async function processWebhook(project: any, argv: Record<string, any>){

    const vcsSlug: string = `${project.vcs_type}/${project.username}/${project.reponame}`;

    const projectResponse = await circleciService.getProjectByName(vcsSlug);

    console.log("projectResponse", projectResponse);

    if(projectResponse.error) throw new Error(projectResponse.error);

    const webhookResponse = await circleciService.getWebhooks(projectResponse.data.id);

    console.log("webhookResponse", webhookResponse);

    if(webhookResponse.error) throw new Error(webhookResponse.error);

    const isWebhookPresent = webhookResponse.data.find((webhook: any) => webhook.url === argv.webhook);

    if(isWebhookPresent) {
        console.log("Webhook already present");
        return;
    }

    const createWebhookResponse = await circleciService.createWebhook({
        name: "6thbridge Webhook",
        url: argv.webhook,
        events: ["workflow-completed", "job-completed"],
        "verify-tls": false,
        "signing-secret": "",
        "scope": {
            "type": "project",
            "id": projectResponse.data.id,
        }
    });

    console.log("createWebhookResponse", createWebhookResponse);
}
execute();
