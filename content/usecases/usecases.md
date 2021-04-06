---
title: Use Cases
weight: -20
---

Applications are moving from a monolithic to a cloud-native approach — built with multiple components spanning multiple clusters and cloud providers. As application workloads move from development to production, IT often requires multiple fit-for-purpose Kubernetes clusters to support continuous integration/continuous delivery (CI/CD) of DevOps pipelines. Cluster sprawl continues with the addition of new clusters configured for specific purposes, such as edge deployments, faster response time, reduced latency, reduced capital expenditures (CapEx), and compliance with data residency requirements. 

Whether your organization is just getting started with a single cluster or already operating in a multi-cluster environment, you likely face some difficult decisions:

- How can I manage the life cycle of multiple clusters regardless of where they reside (on-premise or across public clouds) using a single control plane?  
- How do I get a simplified understanding of my cluster health and the impact it may have on my application availability?  
- How do I automate provisioning and deprovisioning of my clusters?  
- How do I ensure that all of my clusters are compliant with standard and custom policies?  
- How do I get alerted about configuration drift — and remediate it?  
- How can I automate the placement of workloads based on capacity and policy?

## How Open Cluster Management can solve these problems

Open Cluster Management offers end-to-end management visibility and control to manage your cluster and application life cycle, along with security and compliance of your entire Kubernetes domain across multiple datacenters and public clouds. 

It provides a single view to manage your Kubernetes clusters. Easily provision new Kubernetes clusters across: Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP), bare metal, and vSphere. In addition, existing Kubernetes clusters can be imported and managed, like Red Hat OpenShift on IBM Cloud (ROKS), Azure Red Hat OpenShift (ARO), OpenShift Dedicated (OSD), Openshift on Openstack®, and Openshift on IBM Z, as well as public cloud Kubernetes clusters like Amazon Elastic Kubernetes Service (EKS), IBM Cloud Kubernetes Service (IKS), Azure Kubernetes Service (AKS), and Google Kubernetes Service (GKE). 


## Unified multicluster life-cycle management

Create, upgrade, and destroy Kubernetes clusters reliably, consistently, and at scale using an open source programming model that supports and encourages Infrastructure as Code (IaC) best practices and design principles.

| Feature                       | Benefit                                                                                                                                                                                                                                                                                                                                            |
|-------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Cluster life-cycle management | Gain day 1 experience with cluster life-cycle management using the open source Hive (https://github.com/openshift/hive) application programming interface (API) . Create and upgrade new Red Hat OpenShift Container Platform clusters, or import existing OpenShift Container Platform and managed Kubernetes clusters to bring under management. |
| Cloud providers supported     | Creation of OpenShift Container Platform clusters on AWS, GCP, Azure, bare metal, and VMware vSphere.                                                                                                                                                                                                                                              |


## Policy-based governance, risk, and compliance

Apply a policy-based governance approach to automatically monitor and ensure security and configuration controls are operated to industry compliance standards or self-imposed corporate standards in a desired state model.

|                                 Feature                                 |                                                                                                                                                                         Benefit                                                                                                                                                                        |
|:-----------------------------------------------------------------------:|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| Out-of-the-box policy templates for security and configuration controls | Use prebuilt security and configuration controllers to enforce policy on Kubernetes configuration, identity and access management (IAM) and certificate management across your clusters. Define policy-driven compliance via GitOps using the open source policy collection repository (https://github.com/open-cluster-management/policy-collection). |
| Governance and risk dashboard                                           | Use the governance and risk dashboard to view and manage security risks and policy violations in all of your clusters and applications. Get details on violation history.                                                                                                                                                                              |
| Customized policy violation views                                       | Customize policies for various compliance standards, governance dashboard views, and views for most impacted controls for specific standards.                                                                                                                                                                                                          |
| Open source extensible policy framework                                 | Develop custom policy controllers and seamlessly integrate them for centralized management into the governance and risk dashboard.                                                                                                                                                                                                                     |
| Integration with Open Policy Agent (OPA)                                | Make decisions based on policies you define using Open Policy Agent (OPA). You can enforce OPA policies at runtime and receive notification of any OPA policy violations.                                                                                                                                                                              |


## Advanced application life-cycle management 
Use open standards and deploy applications using placement rules that are integrated into existing CI/CD pipelines and governance controls. 

|                             Feature                            |                                                                                                                                                         Benefit                                                                                                                                                        |
|:--------------------------------------------------------------:|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| Application topology view                                      | Quickly view the health of service endpoints and pods associated with your application topology — with all the connected dependencies like image versions, associated placement rules, Kubernetes resources, and ConfigMaps.                                                                                           |
| Channels and subscriptions                                     | Automatically deploy applications to specific clusters by subscribing to different workload (resource) channels, such as GitHub, Helm repository, and ObjectStore types.                                                                                                                                               |
| Placement rules                                                | Deploy workloads to clusters based on placement rule definitions to ensure that they only run on specific clusters with matching labels.                                                                                                                                                                               |
| Ansible integration | Automate everything outside of Kubernetes with your application deployments: configure networking, databases, load balancers, and firewalls with Ansible integration.                                                                                                                      |
| Application builder                                            | Smooth application creation experience using an intuitive form with contextual help to guide you in defining your application components without dealing with YAML.                                                                                                                                                    |
| Argo CD integration                                            | Use Open Cluster Management to allow Argo CD to automatically deliver content as clusters come online or get imported. Open Cluster Management policies work in tandem with Argo CD to make sure compliance and configuration are managed and maintained at scale for tighter CI/CD alignment. |
