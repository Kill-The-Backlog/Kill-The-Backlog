# Deploying to GKE Autopilot

## Prerequisites

1. Install [gcloud](https://cloud.google.com/sdk/docs/install) and [werf](https://werf.io/documentation/v2/quickstart.html).

2. Configure gcloud:

```sh
gcloud auth login
gcloud auth configure-docker <your_region>-docker.pkg.dev
gcloud config set project <your_project_id>
gcloud config set compute/region <your_region>
gcloud container clusters get-credentials primary
```

## Deploy

```sh
werf converge
```

## Setting up a new GKE Autopilot cluster

1. Create the cluster in the GCP console.

2. Configure gcloud:

```sh
gcloud container clusters get-credentials <your_cluster_name>
```

3. Install cert-manager:

```sh
# Request values copied from https://oneuptime.com/blog/post/2026-01-17-helm-cert-manager-tls-certificates/view
# Note: GKE Autopilot will adjust requests to meet its supported minimums.
helm upgrade --install cert-manager cert-manager \
  --repo https://charts.jetstack.io \
  --create-namespace \
  --namespace cert-manager \
  --set resources.requests.cpu=50m \
  --set resources.requests.memory=64Mi \
  --set webhook.resources.requests.cpu=25m \
  --set webhook.resources.requests.memory=32Mi \
  --set cainjector.resources.requests.cpu=25m \
  --set cainjector.resources.requests.memory=64Mi \
  --set startupapicheck.resources.requests.cpu=25m \
  --set startupapicheck.resources.requests.memory=32Mi \
  --set crds.enabled=true \
  --set crds.keep=true \
  --set global.leaderElection.namespace=cert-manager
```

4. Verify cert-manager install:

```sh
kubectl get pods -n cert-manager
```

You should see three pods running: cert-manager, cert-manager-cainjector, and cert-manager-webhook.

5. Create a regional static IP in the GCP console.

6. Install ingress-nginx:

```sh
# Request values copied from the ingress-nginx helm chart.
# Note: GKE Autopilot will adjust requests to meet its supported minimums.
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --create-namespace \
  --namespace ingress-nginx \
  --set controller.admissionWebhooks.createSecretJob.resources.requests.cpu=10m \
  --set controller.admissionWebhooks.createSecretJob.resources.requests.memory=20Mi \
  --set controller.admissionWebhooks.patchWebhookJob.resources.requests.cpu=10m \
  --set controller.admissionWebhooks.patchWebhookJob.resources.requests.memory=20Mi \
  --set controller.service.loadBalancerIP=<your_static_ip> \
  --set controller.allowSnippetAnnotations=true \
  --set controller.config.annotations-risk-level=Critical
```
