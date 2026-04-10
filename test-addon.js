#!/usr/bin/env node

/**
 * CLI tool to test Stremio addon endpoints
 * Usage: node test-addon.js [baseUrl]
 * Default: http://localhost:3000
 */

// Native fetch (Node 18+) - no import needed

const BASE_URL = process.argv[2] || 'http://localhost:3000';

async function testEndpoint(name, url) {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    console.log(`\n📡 ${name}`);
    console.log(`   URL: ${fullUrl}`);

    try {
        const res = await fetch(fullUrl);
        if (!res.ok) {
            console.log(`   ❌ HTTP ${res.status}: ${res.statusText}`);
            return null;
        }
        const data = await res.json();
        console.log(`   ✅ Success`);
        return data;
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        return null;
    }
}

async function main() {
    console.log(`Testing addon at: ${BASE_URL}`);
    console.log('=' .repeat(50));

    // Test manifest
    const manifest = await testEndpoint('Manifest', '/manifest.json');
    if (!manifest) {
        console.log('\n❌ Failed to load manifest - is the server running?');
        process.exit(1);
    }

    console.log(`   Name: ${manifest.name || 'N/A'}`);
    console.log(`   Version: ${manifest.version || 'N/A'}`);
    console.log(`   Catalogs: ${manifest.catalogs?.length || 0}`);

    // Test each catalog
    if (manifest.catalogs && manifest.catalogs.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('Testing Catalogs');

        for (const catalog of manifest.catalogs) {
            const type = catalog.type;
            const id = catalog.id;
            const url = `/catalog/${type}/${id}.json`;

            const data = await testEndpoint(`Catalog: ${catalog.name || id}`, url);

            if (data && data.metas) {
                console.log(`   Items: ${data.metas.length}`);
                if (data.metas.length > 0) {
                    const sample = data.metas[0];
                    console.log(`   Sample: "${sample.name}" (ID: ${sample.id})`);

                    // Test meta endpoint for this item
                    console.log('\n' + '-'.repeat(50));
                    const metaUrl = `/meta/${type}/${sample.id}.json`;
                    const metaData = await testEndpoint('Meta Detail', metaUrl);

                    if (metaData && metaData.meta) {
                        const m = metaData.meta;
                        console.log(`   Title: ${m.name}`);
                        console.log(`   Year: ${m.releaseInfo || 'N/A'}`);
                        console.log(`   Rating: ${m.imdbRating || 'N/A'}`);
                        if (m.videos) {
                            console.log(`   Episodes: ${m.videos.length}`);
                        }
                    }
                    console.log('-'.repeat(50));
                }
            }
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Summary');
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   Manifest: ✅`);

    // Test if TMDB token is set (server would fail to start without it)
    console.log(`   To test against production:`);
    console.log(`   node test-addon.js https://stremio-kids-addon.onrender.com`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
