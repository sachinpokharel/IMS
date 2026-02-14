export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    return {
        apiKeySet: !!config.ncmApiKey,
        apiKeyMasked: config.ncmApiKey ? `${config.ncmApiKey.substring(0, 4)}...${config.ncmApiKey.substring(config.ncmApiKey.length - 4)}` : 'Not Configured',
        apiUrl: config.ncmApiUrl,
        originBranch: config.ncmOriginBranch,
    };
});
