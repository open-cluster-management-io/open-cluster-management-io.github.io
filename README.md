# Website

This repo hosts the website code of open-cluster-management project. The docs website is hosted at https://www.netlify.com/.

The open-cluster-management website is based on the [Hugo framework](https://github.com/gohugoio/hugo), with the [Docsy](https://www.docsy.dev/) applied, and is written in Markdown format.

You can always click the Edit this page link at the top right of each page, but if you want to test your changes locally before submitting you can:

Fork the open-cluster-management-io/open-cluster-management-io.github.io on GitHub.

Check out your copy locally:

```
git clone ssh://git@github.com/<your-user>/open-cluster-management-io.github.io.git
cd open-cluster-management-io.github.io
hugo server
```

An instance of the website is now running locally on your machine and is accessible at http://localhost:1313.

Edit files in src. The browser should automatically reload so you can view your changes.

When you are done with your edit(s) then commit, push, and submit a pull-request for your changes.

Your changes will be verified by CI. Check the job results for details of any errors.

## Special Note

We're also using the website to redirect requests targeting `open-cluster-management.io` to `github.com/open-cluster-management-io`, you can find more details in this [PR](https://github.com/open-cluster-management-io/open-cluster-management-io.github.io/pull/430).

If allows developers to use commands like `go get open-cluster-management.io/<repo>` and also use `open-cluster-management.io/<repo>` as the import path in go.mod.
