import { Platform } from 'react-native';

const productionBaseUrl = 'https://cjmovilempleados-production.up.railway.app';
const isProductionBuild = typeof __DEV__ !== 'undefined' ? !__DEV__ : false;

const defaultLocalBaseUrl = Platform.select({
	android: 'http://192.168.0.187:4000',
	ios: 'http://localhost:4000',
	web: 'http://localhost:4000',
	default: 'http://localhost:4000'
});

export const BASE_URL = isProductionBuild
	? productionBaseUrl
	: defaultLocalBaseUrl;
