# Caedora Onboarding User Stories

This document defines the intended low-friction, privacy-first onboarding flows for Caedora.
The product language is **vault**, not bundle. Caedora must not store user content on Caedora servers.

## Product Principles

- Start in the browser first. A new user should be able to create a useful vault without GitHub, a desktop install, or a filesystem permission prompt.
- Keep advanced storage decisions out of first run. GitHub and local folders are for opening or moving an existing vault.
- Ask for the minimum external permission. GitHub access must be repo-scoped through the GitHub App flow, with no PAT option in the standard UI.
- Make exits obvious. A user must be able to close the current vault or forget saved vault connections and return to the public website.
- Make data ownership explicit. Export, GitHub, and local-folder flows must explain where data lives and what Caedora does not delete.

## Story 1: First-Time Visitor Starts Immediately

As a first-time visitor, I want to click **Start now** and create a vault in my browser, so that I can try Caedora without setup.

Acceptance criteria:
- The primary CTA says **Start now**.
- The flow creates a browser-backed vault by default.
- The user is not asked to choose storage backends before creating the vault.
- The user can name the vault.
- The user can choose a preset: **Personal**, **Work / project**, or **Blank**.
- The user lands inside the new vault after creation.
- No GitHub authorization, filesystem picker, account creation, or PAT is required.

Current status: Supported.

## Story 2: User Chooses a Starter Preset

As a new user, I want to choose a starter preset, so that the first vault feels relevant without adding clutter.

Acceptance criteria:
- **Personal** creates a personal starter concept and welcome guide.
- **Work / project** creates a project starter concept and welcome guide.
- **Blank** creates only the welcome guide and generated indexes.
- All generated concepts are OKF compliant.
- Presets are visually simple and do not hide the primary create button.

Current status: Supported.

## Story 3: Browser Storage Is Honest

As a browser-vault user, I want to understand that my vault is stored in this browser, so that I know what happens if I change device or clear site data.

Acceptance criteria:
- Browser vault creation says the vault is stored in the browser.
- If persistent storage is not granted, the UI warns that browser site data may be cleared.
- The product does not imply Caedora has cloud backup.
- Export is presented as the way to move or back up the vault.

Current status: Mostly supported.

Follow-up:
- Add a clearer persistent-storage health indicator after vault creation.

## Story 4: Existing User Opens a Local Vault

As an existing user, I want to open a vault folder from my computer, so that I can keep my files in local storage.

Acceptance criteria:
- The secondary CTA says **Open existing vault**.
- The open flow offers **Computer** and **GitHub** only.
- The Computer option opens a directory picker.
- Existing OKF vaults open without reseeding.
- If browser filesystem permissions are revoked, the user can re-grant access from a user gesture.

Current status: Supported.

## Story 5: Existing User Connects GitHub

As an existing user, I want to connect GitHub without typing owner/repo manually, so that the flow matches how GitHub Apps work.

Acceptance criteria:
- The GitHub option shows a **Connect GitHub** button.
- The user is sent through the GitHub App flow.
- GitHub asks which repositories Caedora can access.
- The UI instructs the user to choose **Only select repositories**.
- After authorization, Caedora lists repositories it can access.
- The user clicks a repository to open it.
- Caedora stores only the selected vault connection locally.

Current status: Supported.

## Story 6: Already-Connected GitHub Vault Is Easy To Reopen

As a returning user, I want a previously connected GitHub vault to appear in the open flow, so that I do not repeat GitHub authorization.

Acceptance criteria:
- Open existing vault -> GitHub lists saved GitHub vaults for this device.
- Clicking a saved vault reconnects it.
- If a token needs refresh, the existing refresh flow handles it.
- If reconnect fails, the user sees an actionable error and can connect GitHub again.

Current status: Supported for locally saved vaults.

Follow-up:
- Add a clearer reauthorize action when refresh fails.

## Story 7: User Has Granted GitHub App Access But No Local Vault Is Saved

As a user who already installed the GitHub App for a repo on GitHub, I want Caedora to show available repos after I connect GitHub, so that I can open the repo without typing details.

Acceptance criteria:
- The user clicks **Connect GitHub**.
- Caedora lists repos returned by GitHub for the app/user authorization.
- If the expected repo is missing, the UI explains that the user should reopen GitHub access and select that repository.
- The user is not asked for a PAT.

Current status: Supported.

## Story 8: User Exports a Browser Vault

As a browser-vault user, I want to export my vault, so that I can back it up or prepare to move it to GitHub.

Acceptance criteria:
- Vault settings include **Export this vault** for browser vaults.
- Export produces a downloadable file.
- The UI clearly says the current export is a Caedora JSON backup.
- The UI does not imply the JSON file can already be dropped directly into GitHub as an OKF folder.

Current status: Supported as JSON backup.

Follow-up:
- Implement proper OKF folder export.

## Story 9: User Moves a Vault to GitHub

As a user who wants access across devices, I want guidance for moving my browser vault to GitHub, so that I can make it available anywhere while keeping ownership.

Acceptance criteria:
- Export guidance explains the intended path:
  1. Export vault from Caedora.
  2. Create a private GitHub repository.
  3. Add exported OKF files to that repository.
  4. Open Caedora -> Open existing vault -> GitHub.
  5. Select only that repository in GitHub.
- The current UI explicitly says this depends on the future OKF folder export.

Current status: Guidance present, proper OKF folder export not yet implemented.

Follow-up:
- Build OKF folder export and import/reopen smoke tests.

## Story 10: User Closes the Current Vault

As a user inside a vault, I want to close it and return to the website, so that I can see the product like a new visitor.

Acceptance criteria:
- Vault settings show **Close vault** for the current vault.
- Closing a vault clears the active vault pointer.
- Closing a vault does not remove it from saved vaults.
- The user returns to the landing website.

Current status: Supported.

## Story 11: User Starts Over On This Device

As a user testing onboarding, I want to close all saved vaults, so that I can return to a clean website state.

Acceptance criteria:
- The sidebar vault switcher includes **Close all vaults**.
- Vault settings include **Close all vaults**.
- The action confirms before proceeding.
- The action forgets saved vault connections on this device.
- The action does not delete local folders, browser vault data, or GitHub repositories.
- The user returns to the landing website.

Current status: Supported.

## Story 12: User Cancels or Abandons a Modal

As a user who starts a flow by mistake, I want to close the modal cleanly, so that I am not trapped by a pending operation.

Acceptance criteria:
- The close button works even if a GitHub popup or create operation is abandoned.
- Late GitHub popup results are ignored if the modal has unmounted.
- Outside click remains disabled to avoid accidental loss of context.
- Errors return the modal to an actionable idle state.

Current status: Supported.

## Story 13: GitHub Permission Safety

As a privacy-conscious user, I want GitHub access to be scoped to one or more selected repositories, so that Caedora cannot access unrelated repos.

Acceptance criteria:
- The standard UI never asks for a PAT.
- The GitHub copy instructs **Only select repositories**.
- Caedora lists only repos returned by GitHub after authorization.
- No user content is sent to Caedora servers.
- GitHub tokens are stored only in IndexedDB for local reconnect.

Current status: Supported.

Follow-up:
- Add a small “Why GitHub asks this” explanation link or popover if users find the GitHub permission screen scary.

## QA Checklist

Use this checklist before shipping onboarding changes:

- Start now creates a browser vault without GitHub or filesystem prompts.
- Each preset creates OKF-compliant starter files.
- Blank preset has no internal starter concept links.
- Open existing vault -> Computer opens a local folder.
- Open existing vault -> GitHub never asks for username/repo fields.
- GitHub connect lists accessible repos after authorization.
- Previously saved GitHub vaults appear before reconnecting GitHub.
- PAT option is not visible.
- Browser vault export is available and clearly described as JSON backup.
- Close vault returns to the website without deleting the saved vault.
- Close all vaults returns to the website and does not delete user data.
