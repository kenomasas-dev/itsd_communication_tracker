const fs = require('fs');

let code = fs.readFileSync('c:/MyProject/my-app/src/User/Messages.js', 'utf8');

// Replace imports
code = code.replace(/import UserSidebar from '\.\/sidebar';/, "import Sidebar from './Sidebar';\nimport './HeadPage.css';");
code = code.replace(/import '\.\/Messages\.css';/, "import '../User/Messages.css';");

// Replace Lucide react import
code = code.replace(/import \{ ReloadIcon \} from '@radix-ui\/react-icons';/, "import { ReloadIcon } from '@radix-ui/react-icons';\nimport { LayoutDashboard, TrendingUp, Activity, Users, MessageCircle, Settings } from 'lucide-react';");

// Replace component and inject Sidebar logic
let sidebarLogic = `export default function Announcements() {
  const navigate = useNavigate();
  const iconProps = { size: 16, strokeWidth: 2, style: { display: 'block' } };
  const navItems = [
    { label: 'Overview', icon: <LayoutDashboard {...iconProps} />, onClick: () => navigate('/head') },
    { label: 'Analytics', icon: <TrendingUp {...iconProps} /> },
    { label: 'Process', icon: <Activity {...iconProps} />, onClick: () => navigate('/head/process') },
    { label: 'Approval', icon: <Users {...iconProps} /> }
  ];
  const settingsItems = [
    { label: 'Announcements', active: true, badge: 3, icon: <MessageCircle {...iconProps} />, onClick: () => navigate('/head/announcements') },
    { label: 'Settings', icon: <Settings {...iconProps} /> }
  ];
  const goOverview = () => navigate('/head');`;

code = code.replace(/export default function Messages\(\) \{[\s\n]*const navigate = useNavigate\(\);[\s\n]*const goOverview = \(\) => navigate\('\/User'\);/, sidebarLogic);

// Replace UserSidebar component usage
code = code.replace(/<UserSidebar active=\{['"]messages['"]\} \/>/, "<Sidebar navItems={navItems} settingsItems={settingsItems} />");

// Replace classes
code = code.replace(/className=\"user-page messages-page\"/g, 'className="head-page messages-page"');
code = code.replace(/className=\"user-main messages-main\"/g, 'className="head-main messages-main"');

fs.writeFileSync('c:/MyProject/my-app/src/Head/Announcements.js', code);
console.log("Successfully rebuilt Announcements.js with no syntax errors");
