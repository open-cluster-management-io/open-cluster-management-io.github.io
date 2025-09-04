---
title: Open Cluster Management
---

{{< blocks/cover title="Open Cluster Management" image_anchor="right" height="max" color="primary" >}}
<a class="btn btn-lg btn-secondary me-3 mb-4" href="/docs/">
Get Started
</a>
<a class="btn btn-lg btn-secondary me-3 mb-4" href="https://kubernetes.slack.com/channels/open-cluster-mgmt">
Join Our Slack
</a>

<p class="lead mb-6"></p> <!-- To create space between the buttons and the text below -->
<p class="lead mb-6">
  Make working with many Kubernetes clusters super easy regardless of where they are deployed
</p>
<p class="lead mb-6">
  Open Cluster Management is a community-driven project focused on multicluster and multicloud scenarios for Kubernetes apps. Open APIs are evolving within this project for cluster registration, work distribution, dynamic placement of policies and workloads, and much more.
</p>
<p>
  If you like Open Cluster Management, give it a star on <a href="https://github.com/open-cluster-management-io/ocm" class="github-link">GitHub</a>!
</p>
{{< /blocks/cover >}}

{{% blocks/section color="secondary" type="row" title="Features Overview" %}}
{{% blocks/feature icon="fa-server" title="Cluster Inventory" url="docs/concepts/cluster-inventory/" %}}
Registration of multiple clusters to a hub cluster to place them for management.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-tasks" title="Work Distribution" url="docs/concepts/work-distribution/" %}}
The work API that enables resources to be applied to managed clusters from a hub cluster.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-random" title="Content Placement" url="docs/concepts/content-placement/" %}}
Dynamic placement of content and behavior across multiple clusters.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-cloud" title="Vendor Neutral APIs" %}}
Avoid vendor lock-in by using APIs that are not tied to any cloud providers or proprietary platforms.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-rocket" title="Launch Apps Everywhere" url="docs/getting-started/integration/app-lifecycle/" %}}
Use application lifecycle to create your application and deliver hybrid apps across one or more clusters, while you keep up with changes.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-cog" title="Configure, Secure, and Manage Your Resources" url="docs/getting-started/integration/policy-controllers" %}}
Policy and configuration management uses labels to help you deploy policies and control consistently across your resources. Keep your resources secure by using access control and manage your quota and cost.
{{% /blocks/feature %}}
{{% /blocks/section %}}

{{% blocks/section color="secondary" %}}

<div class="col-12">
  <h2 class="text-center">End Users</h2>
  <p class="text-center">
    Open Cluster Management is being used by numerous companies, both large and small.
  </p>
  <p class="text-center">
    Are you one of them as well? <a href="https://github.com/open-cluster-management-io/ocm/blob/main/ADOPTERS.md" target="_blank">Share it with us!</a>
  </p>

  <div class="partners-grid">
    <div class="row justify-content-center">
      <div class="col-lg-8 col-md-10">
        <div class="row g-4">
          <div class="col-md-4 col-sm-6">
            <a href="https://www.alibabacloud.com/" target="_blank" class="text-decoration-none">
              <div class="card h-100 partner-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Alibaba Cloud</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-md-4 col-sm-6">
            <a href="https://www.antgroup.com/" target="_blank" class="text-decoration-none">
              <div class="card h-100 partner-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Ant Group</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-md-4 col-sm-6">
            <a href="https://appscode.com/" target="_blank" class="text-decoration-none">
              <div class="card h-100 partner-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">AppsCode Inc.</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-md-4 col-sm-6">
            <a href="https://github.com/RamenDR/" target="_blank" class="text-decoration-none">
              <div class="card h-100 partner-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">RamenDR</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-md-4 col-sm-6">
            <a href="https://www.redhat.com/" target="_blank" class="text-decoration-none">
              <div class="card h-100 partner-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Red Hat</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-md-4 col-sm-6">
            <a href="https://www.spectrocloud.com/" target="_blank" class="text-decoration-none">
              <div class="card h-100 partner-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Spectro Cloud</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-md-4 col-sm-6">
            <a href="https://www.xiaohongshu.com/" target="_blank" class="text-decoration-none">
              <div class="card h-100 partner-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Xiao Hong Shu</h5>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

{{% /blocks/section %}}

{{% blocks/section color="secondary" %}}

<div class="col-12">
  <h2 class="text-center">Ecosystem</h2>
  <p class="text-center">
    Open Cluster Management has integrations available with a number of open-source projects.
  </p>

  <div class="ecosystem-grid">
    <div class="row justify-content-center">
      <div class="col-lg-10 col-md-12">
        <div class="row g-4">
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster-Decision-Resource/#how-it-works" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Argo CD</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://argocd-agent.readthedocs.io/latest/getting-started/ocm-io/" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Argo CD Agent</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://github.com/argoproj/argo-workflows/issues/3523#issuecomment-1307610573" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Argo Workflows</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://github.com/open-cluster-management-io/ocm/tree/main/solutions/cluster-api" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Cluster API</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://github.com/open-cluster-management-io/addon-contrib/tree/main/clusternet-addon" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Clusternet</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://github.com/open-cluster-management-io/addon-contrib/tree/main/fluid-addon" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Fluid</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://v0-16.open-cluster-management.io/docs/getting-started/integration/app-lifecycle/" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Helm</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://www.icos-project.eu/docs/Administration/ICOS%20Agent/Orchestrators/controlplane/" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">ICOS Meta OS</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://github.com/open-cluster-management-io/multicluster-mesh" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Istio</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://www.npmjs.com/package/@janus-idp/backstage-plugin-ocm-backend" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Janus</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://docs.kubestellar.io/latest/direct/start-from-ocm/" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">KubeStellar</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://kubevela.io/docs/platform-engineers/system-operation/working-with-ocm/" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">KubeVela</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://kueue.sigs.k8s.io/docs/tasks/manage/setup_multikueue/#optional-setup-multikueue-with-open-cluster-management" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Kueue</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://github.com/open-cluster-management-io/addon-contrib/tree/main/open-telemetry-addon" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">OpenTelemetry</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6">
            <a href="https://docs.meshery.io/extensibility/integrations/open-cluster-management" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Meshery</h5>
                </div>
              </div>
            </a>
          </div>
          <div class="col-lg-3 col-md-4 col-sm-6 mx-auto">
            <a href="https://github.com/stolostron/submariner-addon" target="_blank" class="text-decoration-none">
              <div class="card h-100 ecosystem-card">
                <div class="card-body d-flex align-items-center justify-content-center">
                  <h5 class="card-title">Submariner</h5>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

{{% /blocks/section %}}

{{% blocks/section color="primary" %}}
Open Cluster Management is a Cloud Native Computing Foundation sandbox project
{.h3 .text-center}

<div class="text-center">
  <img src="https://raw.githubusercontent.com/cncf/artwork/master/other/cncf/horizontal/white/cncf-white.svg" alt="CNCF logo" style="max-width: 300px; margin-top: 20px;">
</div>
{{% /blocks/section %}}

<!-- Chat Bot Button -->
<div id="chat-bot-button" aria-label="Chat with OCM">
  <i class="fas fa-robot"></i>
</div>

<style>
  #chat-bot-button {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    background-color: #0073e6;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 24px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s ease;
  }

  #chat-bot-button:hover {
    transform: scale(1.1);
  }

  #chat-bot-button:hover::after {
    content: "Chat with OCM";
    position: absolute;
    right: 70px;
    background-color: #333;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 14px;
    white-space: nowrap;
  }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const chatButton = document.getElementById('chat-bot-button');
  chatButton.addEventListener('click', function() {
    window.open('https://deepwiki.com/open-cluster-management-io/ocm', '_blank');
  });
});
</script>
