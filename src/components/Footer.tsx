import React from 'react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            PSMAS Prolegal by Soxfort Solutions © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
