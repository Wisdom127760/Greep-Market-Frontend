// This file is for reference only - Create React App doesn't use it directly
// To suppress source map warnings, you can use the following approaches:

// 1. Set GENERATE_SOURCEMAP=false in .env file
// 2. Use CRACO to override webpack configuration
// 3. Ignore the warnings as they don't affect functionality

module.exports = {
    // This configuration would suppress source map warnings
    // but requires ejecting from Create React App
    module: {
        rules: [
            {
                test: /\.js$/,
                include: /node_modules\/html5-qrcode/,
                use: {
                    loader: 'source-map-loader',
                    options: {
                        filterSourceMappingUrl: () => false,
                    },
                },
            },
        ],
    },
};
