/* eslint-disable */
module.exports = {
	"env": {
		"browser": true,
		"es2021": true,
		"node":true,
	},
	"extends": [
		"eslint:recommended",
		"plugin:react/recommended",
		"plugin:react/jsx-runtime",
		"plugin:@typescript-eslint/recommended"
	],
	"parser": "@typescript-eslint/parser",
	"parserOptions": {
		"ecmaFeatures": {
			"jsx": true
		},
		"ecmaVersion": 13,
		"sourceType": "module"
	},
	"plugins": [
		"react",
		"@typescript-eslint"
	],
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
		"@typescript-eslint/no-var-requires":"off",
		"@typescript-eslint/ban-ts-comment":"warn",
	},
};
