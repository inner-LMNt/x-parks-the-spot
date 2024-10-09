/** @type {import('next').NextConfig} */
const nextConfig = { output: 'standalone', reactStrictMode: false,
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '5001',
                pathname: '/static/images/**',
            },
        ],
    },
}

export default nextConfig
