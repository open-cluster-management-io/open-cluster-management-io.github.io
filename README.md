# Open Cluster Management Website

This repository contains the source code for the [Open Cluster Management](https://open-cluster-management.io/) project website. The website provides documentation, community resources, and information about the Open Cluster Management project.

## About This Repository

This website is built using the [Hugo](https://gohugo.io/) static site generator with the [Docsy](https://www.docsy.dev/) theme. All content is written in Markdown format and organized in the `content/` directory.

The live website is automatically deployed to [open-cluster-management.io](https://open-cluster-management.io/) via Netlify when changes are merged to the main branch.

## Contributing to the Website

### Quick Edits

For small changes, you can use the "Edit this page" link at the top right of any page on the website to make edits directly through GitHub's web interface.

### Local Development

For larger changes or when you want to preview your edits locally:

1. Fork this repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/open-cluster-management-io.github.io.git
   cd open-cluster-management-io.github.io
   ```

3. Install Hugo (version 0.110.0 or later recommended)

4. Start the local development server:
   ```bash
   hugo server
   ```

5. Open your browser to http://localhost:1313 to view the site

6. Edit files in the `content/` directory. The browser will automatically reload to show your changes.

### Submitting Changes

1. Make your changes in a new branch
2. Test your changes locally
3. Commit and push your changes
4. Submit a pull request

All pull requests are automatically tested by CI. Check the job results for any errors that need to be addressed.

## Repository Structure

- `content/` - Website content in Markdown format
- `layouts/` - Hugo layout templates
- `static/` - Static assets (images, files, etc.)
- `assets/` - Source assets for processing
- `hugo.yaml` - Hugo configuration file

## Special Redirects

This website also serves as a redirect service for Go module imports:

- Requests to `open-cluster-management.io/<repo>` redirect to `github.com/open-cluster-management-io/<repo>`
- Requests to `open-cluster-management.io/helm-charts` redirect to the official Helm charts repository

This allows developers to use `go get open-cluster-management.io/<repo>` and import packages using the `open-cluster-management.io/<repo>` path.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
