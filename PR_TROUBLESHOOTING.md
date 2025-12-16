# Pull Request Troubleshooting

When you cannot create a pull request, check these common issues first:

1. **No recent commit**: GitHub requires at least one commit on your branch. Run `git status` to verify changes are staged and `git commit` to create a snapshot.
2. **Missing remote/branch push**: Ensure the branch exists on the remote with `git remote -v` and `git push --set-upstream origin <branch-name>`.
3. **Insufficient permissions**: Confirm you have write access to the repository or fork it and open a PR from your fork.
4. **Branch out-of-date**: Rebase or merge the latest `main` to resolve “out of date” or “merge conflict” errors.
5. **Pre-push checks failing**: Lint, type, or test hooks can block pushes. Run project checks locally and fix failures before reattempting.
6. **PR template requirements**: Some repos require descriptions, linked issues, or reviewers. Fill required fields to enable the PR button.
7. **Automation-only PRs**: In this workspace, use the provided `make_pr` helper after committing to generate the PR body and title automatically once your tree is clean.

If problems persist, capture the exact error message and the output of `git status`, then retrace the applicable step above.
