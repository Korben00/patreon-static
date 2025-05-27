# Contributing to Patreon Static

First off, thank you for considering contributing to Patreon Static! 

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include screenshots if possible

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a step-by-step description of the suggested enhancement
* Provide specific examples to demonstrate the steps
* Describe the current behavior and explain which behavior you expected to see instead
* Explain why this enhancement would be useful

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the JavaScript styleguide
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Important Security Guidelines

**NEVER commit real API keys, secrets, or credentials!**

When contributing:

1. Always use placeholder values like:
   - `your-client-id`
   - `your-campaign-id`
   - `your-worker.workers.dev`
   
2. Never include:
   - Real Patreon client IDs or secrets
   - Real campaign or creator IDs
   - Real worker URLs
   - Any other sensitive data

3. If you accidentally commit sensitive data:
   - Immediately notify the maintainers
   - The commit will need to be removed from history
   - You'll need to regenerate any exposed credentials

## Development Setup

1. Fork the repo
2. Clone your fork
3. Create a new branch: `git checkout -b my-feature`
4. Make your changes
5. Test thoroughly
6. Commit your changes: `git commit -am 'Add some feature'`
7. Push to the branch: `git push origin my-feature`
8. Submit a pull request

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

* Use 2 spaces for indentation
* Use semicolons
* Use single quotes for strings
* Add trailing commas in multi-line objects/arrays
* Document all functions with JSDoc comments

### Documentation Styleguide

* Use Markdown
* Reference functions and variables in backticks: \`functionName()\`
* Include code examples for all new features

## Testing

Please make sure all tests pass before submitting a PR:

```bash
# Run tests (when available)
npm test
```

## Questions?

Feel free to contact the maintainer at korben@korben.info or open an issue.

Thank you for contributing! 🎉