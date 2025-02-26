const path = require("path");
const NodemonPlugin = require("nodemon-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const NodeExternals = require("webpack-node-externals");

module.exports = {
    mode: "development",
    target: "node",
    resolve: {
        extensions: [".js", ".json", ".ts", ".graphql"],
        alias: {
            "@": path.resolve(__dirname, "src")
        }
    },
    entry: {
        execution: "./src/classes/localex/seed-execution.ts",
        server: "./src/server.ts"
    },
    output: {
        library: "ensemble-manager",
        libraryTarget: "umd",
        filename: "[name].js",
        path: path.resolve(__dirname, "dist")
    },
    externals: [NodeExternals()],
    module: {
        rules: [
            {
                test: /\.graphql$/,
                exclude: /node_modules/,
                loader: "graphql-tag/loader"
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: "ts-loader"
            }
        ]
    },
    plugins: [
        new NodemonPlugin({
            script: "./dist/server.js"
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "./src/api",
                    to: "api"
                },
                {
                    from: "./src/utils",
                    to: "utils"
                },
                {
                    from: "./src/config",
                    to: "config"
                }
            ]
        })
    ],
    node: {
        __dirname: false
    }
};
