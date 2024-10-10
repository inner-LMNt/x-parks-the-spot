import React from 'react';
import { motion } from 'framer-motion';

interface ExpandableSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ExpandableSidebar: React.FC<ExpandableSidebarProps> = ({ isOpen, children }) => {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? '0%' : '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-10"
    >
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  );
};

export default ExpandableSidebar;