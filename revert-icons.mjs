import fs from 'fs';
import path from 'path';

const iconMap = {
  'MdSearch': 'Search',
  'MdTune': 'SlidersHorizontal',
  'MdChevronLeft': 'ChevronLeft',
  'MdChevronRight': 'ChevronRight',
  'MdVisibility': 'Eye',
  'MdArrowBack': 'ArrowLeft',
  'MdLocationOn': 'MapPin',
  'MdEmail': 'Mail',
  'MdPhone': 'Phone',
  'MdCalendarMonth': 'Calendar',
  'MdVerifiedUser': 'ShieldCheck',
  'MdAccountBalanceWallet': 'CreditCard',
  'MdBusinessCenter': 'Briefcase',
  'MdWarning': 'AlertTriangle',
  'MdClose': 'X',
  'MdAdd': 'Plus',
  'MdGridView': 'Grid',
  'MdDomain': 'Grid',
  'MdAccessTime': 'Clock',
  'MdSync': 'Loader2',
  'MdFileUpload': 'Upload',
  'MdSouth': 'ArrowDownToLine',
  'MdCheckCircle': 'CheckCircle2',
  'MdCancel': 'XCircle',
  'MdNorth': 'ArrowUpFromLine',
  'MdAccountBalance': 'Landmark',
  'MdTrendingUp': 'TrendingUp',
  'MdPayments': 'Wallet',
  'MdArrowUpward': 'ArrowUpRight',
  'MdArrowDownward': 'ArrowDownRight',
  'MdErrorOutline': 'AlertCircle'
};

const iconReverseMap = Object.entries(iconMap).reduce((acc, [md, lucide]) => {
  acc[md] = lucide;
  return acc;
}, {});

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      if (content.includes("react-icons/md")) {
        changed = true;
        
        // Find all Md* imports
        const importRegex = /import\s+{([^}]+)}\s+from\s+['"]react-icons\/md['"];/g;
        content = content.replace(importRegex, (match, imports) => {
          const mds = imports.split(',').map(s => s.trim()).filter(Boolean);
          const lucides = mds.map(md => iconReverseMap[md] || md);
          return `import { ${lucides.join(', ')} } from 'lucide-react';`;
        });
        
        // Replace all <MdSomething /> with <LucideSomething />
        for (const [md, lucide] of Object.entries(iconReverseMap)) {
          const mdTagRegex = new RegExp(`<${md}([^>]*)>`, 'g');
          content = content.replace(mdTagRegex, `<${lucide}$1 fill="currentColor" fillOpacity={0.2}>`);
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Reverted ${fullPath}`);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
console.log('Done reverting icons');
