import os
import subprocess
import sys

DIST = './.vitepress/dist'
# docs.skapi.com is a Skapi staff site on the web hosting storage: the files go in the
# docs/ folder of the host bucket, served by the host CDN like any hosted site. A top
# folder of 4 characters or fewer is never a project's subdomain (registration needs at
# least 5), so the host stack's s3_notification keeps no file rows for it.
HOST_BUCKET = 's3://host-storage-us-east-1-136564153953-us31-host'
SITE = 'ios'
BUCKET = f'{HOST_BUCKET}/{SITE}'
# The host CDN (*.skapi.com). It serves every hosted site: invalidate /docs/* only.
DISTRIBUTION = 'E1SPNIMHK9FF60'
INVALIDATION_PATH = f'/{SITE}/*'
# The 404 page pointer the host edge reads on a miss: the path of the file to serve. A
# missing address gets index.html with status 200, and VitePress routes it on the page.
PAGE_404 = 'index.html'

# Cache headers for everything uploaded below. Without a Cache-Control header
# browsers guess how long to keep a file (about 10% of its age), so a reader
# could stay on an old page for days after a deploy.
#
# ASSET_CACHE: the files under assets/ (scripts, styles, fonts). VitePress puts
# a content hash in every name there, so a changed file gets a new name and an
# existing name never changes. Browsers keep them for a year and never ask again.
#
# PAGE_CACHE: the pages, and everything that is read under a fixed name
# (hashmap.json, vp-icons.css, sitemap.xml, robots.txt, llms.txt, SKAPI.md).
# Browsers ask on every visit and get a 304 when nothing changed, so a deploy
# shows on the next page load.
#
# MEDIA_CACHE: the images from public/ (screenshots, logos, icons). Their names
# carry no hash and a screenshot is sometimes replaced under the same name, so
# browsers keep them for one hour: no request per image while someone reads,
# and a replaced image shows within the hour.
#
# s-maxage is replaced by the host edge, which keeps every site file six months:
# the invalidation at the end is what makes a deploy show.
ASSET_CACHE = 'public, max-age=31536000, immutable'
PAGE_CACHE = 'public, max-age=0, must-revalidate, s-maxage=86400'
MEDIA_CACHE = 'public, max-age=3600, s-maxage=86400'

# The file types that get MEDIA_CACHE. Any other file outside assets/ gets
# PAGE_CACHE, so a new file type is never kept longer than it should be.
MEDIA_TYPES = ['png', 'webp', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'avif']

ret = os.system('git pull')

if ret != 0:
    print('==Failed to pull==')

# "build" runs agent-docs.mjs (SKAPI.md, SKAPI-full.md, md/<page>.md and llms.txt into
# public/, which VitePress copies to dist/) and then vitepress build. It fails when SKAPI.md grows past its size cap or links to a page
# that was not written, so a broken prompt file never reaches the bucket.
ret = os.system('npm run build')

if ret != 0:
    # Stop here: carrying on would sync whatever older .vitepress/dist is on disk.
    print('==Failed to build==')
    sys.exit(1)

# os.system(
#     f'cp ./.vitepress/dist/index.html ./.vitepress/dist/cfacdb7c8270a90aba6011585793dfc3.html')

media_only = ' '.join(f'--include "*.{t}"' for t in MEDIA_TYPES)
no_media = ' '.join(f'--exclude "*.{t}"' for t in MEDIA_TYPES)

uploads = [
    # Assets first, so a new page never points at a file that is not uploaded yet.
    f'aws s3 sync {DIST}/assets {BUCKET}/assets'
    f' --cache-control "{ASSET_CACHE}"',

    # The last matching filter wins: leave everything out, take the media types
    # back in, leave assets/ out again.
    f'aws s3 sync {DIST} {BUCKET}'
    f' --exclude "*" {media_only} --exclude "assets/*" --cache-control "{MEDIA_CACHE}"',

    # The rest: the pages and the fixed-name files.
    f'aws s3 sync {DIST} {BUCKET}'
    f' --exclude "assets/*" {no_media} --cache-control "{PAGE_CACHE}"',
]

# The files for AI agents (SKAPI.md, SKAPI-full.md, md/*.md, llms.txt) are in dist/ with the
# pages, so the sync above uploads them with PAGE_CACHE: a deploy shows on the agent's next
# read. The sync never deletes, so skapi-docs.md, skapi-types.md and SYSTEM.md from earlier
# deploys stay in the bucket until removed by hand (aws s3 rm). S3 types a .md as text/markdown from its name,
# which the MCP server's readDocs relies on to tell a page from the site's HTML error page.

for command in uploads:
    ret = os.system(command)

    if ret != 0:
        # No invalidation: CloudFront keeps serving the pages it already has.
        print('==Failed to upload==')
        print(f'The command that failed: {command}')
        sys.exit(1)

# The 404 page pointer, after the pages, so it never names a file that is not there yet.
pointer = subprocess.run(
    ['aws', 's3', 'cp', '-', f'{BUCKET}/!404',
     '--content-type', 'text/plain; charset=utf-8', '--cache-control', PAGE_CACHE],
    input=PAGE_404, text=True,
)

if pointer.returncode != 0:
    print('==Failed to upload the 404 page pointer==')
    print(f'Missing addresses on docs.skapi.com get a plain not-found until {BUCKET}/!404 holds "{PAGE_404}".')
    sys.exit(1)

# os.system(
#     'aws cloudfront create-invalidation --distribution-id E24V4Z3Y276PE3 --paths "/*"'
# )

invalidate = (
    f'aws cloudfront create-invalidation --distribution-id {DISTRIBUTION} --paths "{INVALIDATION_PATH}"'
)
started = subprocess.run(
    invalidate + ' --query Invalidation.Id --output text',
    shell=True, stdout=subprocess.PIPE, text=True,
)
invalidation = started.stdout.strip()

if started.returncode != 0 or not invalidation:
    print('==Failed to clear the CloudFront cache==')
    print(
        f'The files are in {BUCKET}, but docs.skapi.com can serve the previous version'
        ' for up to six months. To clear the cache yourself, run:'
    )
    print(invalidate)
    sys.exit(1)

# Wait until CloudFront is done, so what runs next (a dashboard build downloads
# https://docs.skapi.com/SKAPI.md, the MCP server reads /md/ pages on demand) reads the
# new files and not the old copies.
print(f'==Clearing the CloudFront cache of docs.skapi.com (invalidation {invalidation})==')
ret = os.system(
    'aws cloudfront wait invalidation-completed'
    f' --distribution-id {DISTRIBUTION} --id {invalidation}'
)

if ret != 0:
    print('==The CloudFront cache is still clearing==')
    print(
        'The deploy itself is complete. Before you build a dashboard, check that this'
        ' prints "Completed":'
    )
    print(
        f'aws cloudfront get-invalidation --distribution-id {DISTRIBUTION}'
        f' --id {invalidation} --query Invalidation.Status --output text'
    )

print('==END==')
