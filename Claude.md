## Documentation

The folders in `/docs` serve as the documentation for the agent to use. You (the agents) are free to read and write from it. 

Two exceptions to the rule:
 - `docs/feedback/` contains numbered feedback from the user to the agent. You will be specifically prompted to implement this. You will never write to any of these files. They serve as a log of what has happened, not as a live document. It may contain outdated information. You're allowed to read it, but only if there is information about the history you need. Do not expect this data to be up to date.
 - `docs/requests/` contains numbered requests from the user to the agent. You will be specifically prompted to implement this. You will never write to any of these files. They serve as a log of what has happened, not as a live document. It may contain outdated information. You're allowed to read it, but only if there is information about the history you need. Do not expect this data to be up to date.

## Domain language

Use the terms from `docs/domain-language.md` consistently in conversation, docs and code. Add new terms there when a new concept is introduced. See `docs/architecture.md` for how the code is organised.
