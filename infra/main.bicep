targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, staging, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('GitHub token for Copilot SDK')
@secure()
param copilotGithubToken string = ''

@description('GitHub token for repository access')
@secure()
param githubToken string = ''

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

module samplesApp './modules/container-app.bicep' = {
  name: 'samples-app'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}samples-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'samples' })
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryName: containerRegistry.outputs.name
    secrets: [
      {
        name: 'copilot-github-token'
        value: copilotGithubToken
      }
      {
        name: 'github-token'
        value: githubToken
      }
    ]
    env: [
      {
        name: 'COPILOT_GITHUB_TOKEN'
        secretRef: 'copilot-github-token'
      }
      {
        name: 'GITHUB_TOKEN'
        secretRef: 'github-token'
      }
      {
        name: 'CONNECTOR_MODE'
        value: 'mock'
      }
      {
        name: 'LOG_LEVEL'
        value: 'info'
      }
    ]
  }
}

module acrPullRole './modules/acr-pull-role.bicep' = {
  name: 'acr-pull-role'
  scope: rg
  params: {
    containerRegistryName: containerRegistry.outputs.name
    principalId: samplesApp.outputs.identityPrincipalId
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = containerAppsEnvironment.outputs.id
output AZURE_CONTAINER_APPS_ENVIRONMENT_NAME string = containerAppsEnvironment.outputs.name
output SERVICE_SAMPLES_NAME string = samplesApp.outputs.name
output SERVICE_SAMPLES_URI string = samplesApp.outputs.uri
