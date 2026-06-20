import React from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const Layout = ({ children, onRefresh, title }) => {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <TopNavbar onRefresh={onRefresh} title={title} />

        {/* Content Wrapper */}
        <main className="flex-1 p-8 text-slate-100 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
