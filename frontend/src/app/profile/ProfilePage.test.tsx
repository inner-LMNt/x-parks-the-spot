import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfilePage from './ProfilePage'; // Adjust the import path if necessary

// Mock Next.js Link component to avoid navigation issues
jest.mock('next/link', () => {
    return ({ children }) => {
        return children;
    };
});

describe('ProfilePage', () => {
    beforeEach(() => {
        render(<ProfilePage />);
    });

    it('renders the profile section with stats', () => {
        // Check that the profile stats container is rendered
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(); // The main profile heading

        // Check that there are profile stats displayed (for rating, posts, years)
        const profileStats = screen.getAllByText(/rating|posts|years/i);
        expect(profileStats.length).toBeGreaterThan(0);
    });

    it('renders the comments section', () => {
        // Check that the comments section header is rendered
        expect(screen.getByText(/comments/i)).toBeInTheDocument();

        // Ensure that comments are being rendered (we don't check exact content or number)
        const comments = screen.getAllByText(/comment|experience|spot|service/i, { exact: false });
        expect(comments.length).toBeGreaterThan(0); // Ensure comments exist
    });

    it('renders the settings icon', () => {
        // Check that the settings icon link is rendered
        expect(screen.getByLabelText(/settings/i)).toBeInTheDocument();
    });
});
