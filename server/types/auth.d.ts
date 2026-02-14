declare module 'nuxt-auth-utils' {
    interface User {
        id: string;
        email: string;
        name: string;
        role: 'admin' | 'member' | 'viewer';
    }
}

export { };
