#!/bin/sh
# Deploys the web app from this checkout, on the production box itself -- the
# same steps .github/workflows/deploy.yml runs, for when GitHub Actions can't
# (an outage, a billing block: the runner on this box only ever runs jobs
# GitHub hands it). Keep the two in step: a step added to one belongs in the
# other.
#
#   scripts/deploy-local.sh            # deploy this checkout as it is
#   scripts/deploy-local.sh --pull     # first fast-forward it to origin/master
#
# It skips CI. Run lint, tsc -b, build and test somewhere first if the commits
# being deployed haven't passed CI.
#
# ENV_FILE overrides where the build args (.env.docker) live (default: the
# same file deploy.yml uses). Needs node 24 and docker on the box.
set -eu

cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-/home/nicholas/qamooscheh/qamooscheh-web/.env.docker}"

pull=false
for arg in "$@"; do
    case "$arg" in
        --pull) pull=true ;;
        *) echo "usage: $0 [--pull]" >&2; exit 2 ;;
    esac
done

[ -f "$ENV_FILE" ] || { echo "No env file at $ENV_FILE (set ENV_FILE)." >&2; exit 1; }

# Docker needs root here unless this user is in the docker group.
if docker info > /dev/null 2>&1; then DOCKER="docker"; else DOCKER="sudo docker"; fi
compose() { $DOCKER compose --env-file "$ENV_FILE" "$@"; }

# Only master gets deployed, and only what's committed: an uncommitted edit
# would ship without ever being in the repository.
branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "master" ] || { echo "On '$branch'; deploy from master." >&2; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Uncommitted changes; commit or stash them first." >&2; git status --short --untracked-files=no >&2; exit 1; }
if $pull; then
    git fetch --quiet origin master
    git merge --ff-only --quiet origin/master
fi
echo "Deploying $(git log --oneline -1)"

# Prune old images however the deploy ends, as deploy.yml does.
trap '$DOCKER image prune -f > /dev/null' EXIT

# The grader this deploy ships is verified here and the image build keeps
# exactly those files (public/grader/ is in the build context).
node scripts/fetch-grader.mjs
node scripts/verify-grader.mjs

# The commit becomes the build's version, sent to the API as X-Client. A shell
# variable outranks --env-file in compose's interpolation. --no-cache because
# the layers copy public/grader/, which a cached layer of an unchanged source
# tree would hide when only the published grader changed.
VITE_APP_VERSION=$(git rev-parse HEAD)
export VITE_APP_VERSION
compose build --no-cache
compose up -d
echo "Deployed $VITE_APP_VERSION."
