/* eslint-disable */
module.exports = {
	"root": true,
	"env": {
		"browser": true,
		"commonjs": true,
		"es2021": true
	},
	"parserOptions": {
		"ecmaVersion": "latest"
	},
	"rules": {
		"@typescript-eslint/no-unused-vars": ["off"],
	},
	"overrides": [
		{
			"files": ["src/*.jsx", "src/**/*.mjs", "src/*.ts*",],
			"excludedFiles": "*.test.js",
			"env": {
				// "browser": true,
				// "es2021": true,
			},
			"extends": [
				"eslint:recommended",
				"plugin:react/recommended",
				// "plugin:react/jsx-runtime",
				"plugin:@typescript-eslint/recommended"
			],
			"parser": "@typescript-eslint/parser",
			"rules": {
				"@typescript-eslint/no-unused-vars": ["off"],
				"@typescript-eslint/ban-types": [
					"error",
					{
						"types": {
							/**
							 * 隨便給個什麼值好像就可以禁用了
							 */
							"{}": false
						}
					}
				],
				"@typescript-eslint/no-var-requires": "off",
				"@typescript-eslint/ban-ts-comment": "warn",
			},
		},
		{
			"files": ["*.test.js",],
			// "excludedFiles": "*.test.js",
			"env": {
				"jest": true,
			},
			"extends": [
				"eslint:recommended",
				"plugin:react/recommended",
				"plugin:react/jsx-runtime",
				"plugin:@typescript-eslint/recommended"
			],
			"parser": "@typescript-eslint/parser",
			"parserOptions": {
				"sourceType": "module"
			},
			"rules": {
				"@typescript-eslint/no-unused-vars": ["off"],
				"@typescript-eslint/no-var-requires": "off",
				"@typescript-eslint/ban-ts-comment": "warn",
			},

		}
	]
}
