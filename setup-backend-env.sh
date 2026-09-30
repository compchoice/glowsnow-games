#!/bin/bash

# Backend Environment Variables Setup Script
# Generated from Vly for Git Sync
# Run this script to set up your Convex backend environment variables

echo 'Setting up Convex backend environment variables...'

# Check if Convex CLI is installed
if ! command -v npx &> /dev/null; then
    echo 'Error: npx is not installed. Please install Node.js and npm first.'
    exit 1
fi

echo "Setting JWKS..."
bunx convex env set "JWKS" -- "{\"keys\":[{\"kty\":\"RSA\",\"n\":\"uxN-c0Z6DX8iq6_5Is0oBos7J0NYZsPhJ1Me47AW-54E_FZtrEdTfz9w4mE7dBWBsf5ytlkdsWYYvtHxlExvzQ3HWFpHxsw0kE1k-DHr3Hi86jb7xB-5-f85Xp7FA1dAWPb2Q5ogcECjWpkd7zkK3M7Cx9h0aE_Eqf02z4cXLNkTJ4MOqVD4U8Wc5eADdNI7_s9pQYBr4amQq-uCr6hv6B9TUZY2zRkRrtu2kLf_gMiJAvbSKDU2y9oLHfooPhtXTupxoo1eOYvvBLkK9vMJP2xMqgDjnvFkNhpDjl7zAu5pzI2RltgrWHP0FGEO3zdgMJa6dTvog-hBk9g7q2keOQ\",\"e\":\"AQAB\",\"use\":\"sig\"}]}"

echo "Setting JWT_PRIVATE_KEY..."
bunx convex env set "JWT_PRIVATE_KEY" -- "-----BEGIN PRIVATE KEY----- MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7E35zRnoNfyKr r/kizSgGizsnQ1hmw+EnUx7jsBb7ngT8Vm2sR1N/P3DiYTt0FYGx/nK2WR2xZhi+ 0fGUTG/NDcdYWkfGzDSQTWT4MevceLzqNvvEH7n5/zlensUDV0BY9vZDmiBwQKNa mR3vOQrczsLH2HRoT8Sp/TbPhxcs2RMngw6pUPhTxZzl4AN00jv+z2lBgGvhqZCr 64KvqG/oH1NRljbNGRGu27aQt/+AyIkC9tIoNTbL2gsd+ig+G1dO6nGijV45i+8E uQr28wk/bEyqAOOe8WQ2GkOOXvMC7mnMjZGW2CtYc/QUYQ7fN2Awlrp1O+iD6EGT 2DuraR45AgMBAAECggEACNpBDVjsLSfTPu8embo+FuMvSyoZbJF/3dHF4C3kxIbj gwJfAbxFU/vvTlMeEl3zK3ZYPM9GQ68KZDtAlI0ybDBm+sQY6ewfX6W97a3FFMOE 4wtzigIbVZxxfUwDlCcklSEooaXRO6afZEnjG/8lx7GkD3trdMUzj/y6w4LHwrg1 BPK0nRO33O1LrVkguNqNCAd1YIqKz33buIMOVzu+KTT2xXqSDhFRGf/zWX5775zG uk+Ty8mi/R35lCHBXAe2gQFCoRGqvVumQXhmxMtB/awLVVOj1Pio28+ERAN3RZ95 G41UEpuM16mDe3SM/hK1gZkmpqnVzpcMXFelR2e0pQKBgQD/kVq33yR1M7VNSIIB RRZp/n9GN5wOgDww3kCqNRPR3NY1nEo4oIOFIxWChDngwQX4vpzWDhxJqRtTfxJI /hwo95Xf4C5qqT2y0wDgbsiCcpzj4ydS+6cyLv/tjK3EKkvsVs91piC2op8stoT5 1aoBldKVl3y5nU8iE2IfHRLnjQKBgQC7ZHydYrw7a78d+KOxf3j3aMHFY4D9b+Z+ tRt5F5QmxG3Urdwot0Y6SDR1LuhyZyC+HWe9n+7N6XCCFHeGnKEtakYXhU184REU K2Q8rRqXkB1Fiii8Roxu3huWqMpGQv9WOitZq51FmXenR2dyczeDhOYXd7Li1u0T 6bVvnXcAXQKBgQCgLgZiAGXlX4de7PcuvJKT1IMJC4mwPQd8yZBWHfZSLsvDxjVu 0IweQiMVLrLn/5MymKXMNAPe1zLdXmOjhEE6HBO/wc7V40Vcc4u1HzplKFjVLGZV SI0+kt6tkOLIdIopky9sWbdfQQXrDGrD+/sWC0V1pQDzhXk3rlZtkddrcQKBgCkj JyQZz76vqZX3xl+p3zFZAujFLkT0ssHwGibcIT7dckr1G9aoXTdgMHvlH0w2DX8O z35WRMNZUsSLn62iZtOkd9yj+93FPs2RtQCI88R/850XdlfWmO+hvKa3SShhftI8 FNYrkWv9A8JqL3B1kKNDootWUKPxkLwFWzo0dDJVAoGBAJ+7dPI/pyZrks+MIkGK 4M6lxaoHOJPCvRVK5w5OuaMwkO1AZyiVy2TBKrxkWe9CWo7+Zg30GawAiUsU+0tA zpDTQlYJ6ACf8h1HD9tm5AgjKNUJ/1hOAtkeiwaZSoQChHRLaIUWjCITA+yzaot+ rlgEUzQmXKVHOnXAPGo4SI0f -----END PRIVATE KEY-----"

echo "Setting SITE_URL..."
bunx convex env set "SITE_URL" -- "https://hushed-rhinoceros-310.convex.site"

echo "Setting VLY_APP_NAME..."
bunx convex env set "VLY_APP_NAME" -- "GlowSnow Games"

echo "Setting VLY_CONVEX_AUTH_ISSUER..."
bunx convex env set "VLY_CONVEX_AUTH_ISSUER" -- "https://freebuff.com"

echo "Setting VLY_INTEGRATION_BASE_URL..."
bunx convex env set "VLY_INTEGRATION_BASE_URL" -- "https://integrations.vly.ai/"

echo "Setting VLY_INTEGRATION_KEY..."
bunx convex env set "VLY_INTEGRATION_KEY" -- "sk_1cb8c230116885215d5d575e7514e33295aa2a0bc2e9bcba609d07b0a28c353f"

echo "✅ All backend environment variables have been set!"
echo "You can now run: pnpm dev:backend"
