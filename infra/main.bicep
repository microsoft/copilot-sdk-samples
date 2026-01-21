targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, staging, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Default connector mode: mock or live')
param connectorMode string = 'mock'

@description('Log level: debug, info, warn, error')
param logLevel string = 'info'

@description('GitHub token for Copilot SDK')
@secure()
param copilotGithubToken string = ''

@description('GitHub token for repository access')
@secure()
param githubToken string = ''

@description('Target GitHub owner for samples')
param githubOwner string = ''

@description('Target GitHub repo for samples')
param githubRepo string = ''

@description('Atlassian email for Jira/Confluence')
param atlassianEmail string = ''

@description('Atlassian API token')
@secure()
param atlassianApiToken string = ''

@description('Atlassian domain (e.g., yourcompany.atlassian.net)')
param atlassianDomain string = ''

@description('PagerDuty API key')
@secure()
param pagerdutyApiKey string = ''

@description('Datadog API key')
@secure()
param datadogApiKey string = ''

@description('Datadog Application key')
@secure()
param datadogAppKey string = ''

@description('Datadog site (e.g., datadoghq.com)')
param datadogSite string = 'datadoghq.com'

@description('Snyk API token')
@secure()
param snykApiToken string = ''

@description('Snyk organization ID')
param snykOrgId string = ''

@description('Slack bot token')
@secure()
param slackBotToken string = ''

@description('Slack signing secret')
@secure()
param slackSigningSecret string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
  'project': 'copilot-sdk-samples'
}

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
  }
}

module containerAppsEnvironment './modules/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  scope: rg
  params: {
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
  }
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'container-registry'
  scope: rg
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    tags: tags
  }
}

var apiSecrets = [
  { name: 'copilot-github-token', value: copilotGithubToken }
  { name: 'github-token', value: githubToken }
  { name: 'atlassian-api-token', value: atlassianApiToken }
  { name: 'pagerduty-api-key', value: pagerdutyApiKey }
  { name: 'datadog-api-key', value: datadogApiKey }
  { name: 'datadog-app-key', value: datadogAppKey }
  { name: 'snyk-api-token', value: snykApiToken }
  { name: 'slack-bot-token', value: slackBotToken }
  { name: 'slack-signing-secret', value: slackSigningSecret }
]

var apiEnvVars = [
  { name: 'PORT', value: '3001' }
  { name: 'CONNECTOR_MODE', value: connectorMode }
  { name: 'LOG_LEVEL', value: logLevel }
  { name: 'COPILOT_GITHUB_TOKEN', secretRef: 'copilot-github-token' }
  { name: 'GITHUB_TOKEN', secretRef: 'github-token' }
  { name: 'GITHUB_OWNER', value: githubOwner }
  { name: 'GITHUB_REPO', value: githubRepo }
  { name: 'ATLASSIAN_EMAIL', value: atlassianEmail }
  { name: 'ATLASSIAN_API_TOKEN', secretRef: 'atlassian-api-token' }
  { name: 'ATLASSIAN_DOMAIN', value: atlassianDomain }
  { name: 'PAGERDUTY_API_KEY', secretRef: 'pagerduty-api-key' }
  { name: 'DATADOG_API_KEY', secretRef: 'datadog-api-key' }
  { name: 'DATADOG_APP_KEY', secretRef: 'datadog-app-key' }
  { name: 'DATADOG_SITE', value: datadogSite }
  { name: 'SNYK_API_TOKEN', secretRef: 'snyk-api-token' }
  { name: 'SNYK_ORG_ID', value: snykOrgId }
  { name: 'SLACK_BOT_TOKEN', secretRef: 'slack-bot-token' }
  { name: 'SLACK_SIGNING_SECRET', secretRef: 'slack-signing-secret' }
]

module apiApp './modules/container-app.bicep' = {
  name: 'api-app'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}api-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'api' })
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryName: containerRegistry.outputs.name
    secrets: apiSecrets
    env: apiEnvVars
  }
}

module webApp './modules/frontend-app.bicep' = {
  name: 'web-app'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}web-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'web' })
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryName: containerRegistry.outputs.name
    env: [
      {
        name: 'VITE_API_URL'
        value: apiApp.outputs.uri
      }
    ]
  }
}

module acrPullRoleApi './modules/acr-pull-role.bicep' = {
  name: 'acr-pull-role-api'
  scope: rg
  params: {
    containerRegistryName: containerRegistry.outputs.name
    principalId: apiApp.outputs.identityPrincipalId
  }
}

module acrPullRoleWeb './modules/acr-pull-role.bicep' = {
  name: 'acr-pull-role-web'
  scope: rg
  params: {
    containerRegistryName: containerRegistry.outputs.name
    principalId: webApp.outputs.identityPrincipalId
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = containerAppsEnvironment.outputs.id
output AZURE_CONTAINER_APPS_ENVIRONMENT_NAME string = containerAppsEnvironment.outputs.name
output SERVICE_API_NAME string = apiApp.outputs.name
output SERVICE_API_URI string = apiApp.outputs.uri
output SERVICE_WEB_NAME string = webApp.outputs.name
output SERVICE_WEB_URI string = webApp.outputs.uri
