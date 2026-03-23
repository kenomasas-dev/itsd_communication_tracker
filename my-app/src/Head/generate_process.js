const fs = require('fs');

try {
    let code = fs.readFileSync('c:/MyProject/my-app/src/User/Projects.js', 'utf8');

    // Replacements
    code = code.replace(/import UserSidebar from '\.\/sidebar';/, "import Sidebar from './Sidebar';\nimport { useNavigate } from 'react-router-dom';\nimport './HeadPage.css';");
    code = code.replace(/import '\.\/Projects\.css';/, "import '../User/Projects.css';");
    code = code.replace(/import \{ LayoutGrid, List \} from 'lucide-react';/, "import { LayoutGrid, List, LayoutDashboard, TrendingUp, Activity, Users, MessageCircle, Settings } from 'lucide-react';");

    code = code.replace(/export default function Projects\(\) \{/, `export default function Process() {
  const navigate = useNavigate();
  const iconProps = { size: 16, strokeWidth: 2, style: { display: 'block' } };
  const navItems = [
    { label: 'Overview', icon: <LayoutDashboard {...iconProps} />, onClick: () => navigate('/head') },
    { label: 'Analytics', icon: <TrendingUp {...iconProps} /> },
    { label: 'Process', active: true, icon: <Activity {...iconProps} />, onClick: () => navigate('/head/process') },
    { label: 'Approval', icon: <Users {...iconProps} /> }
  ];
  const settingsItems = [
    { label: 'Announcements', badge: 3, icon: <MessageCircle {...iconProps} /> },
    { label: 'Settings', icon: <Settings {...iconProps} /> }
  ];`);

    code = code.replace(/<UserSidebar active=\{active\} onSelect=\{setActive\} \/>/, "<Sidebar navItems={navItems} settingsItems={settingsItems} />");
    code = code.replace(/className=\"user-page projects-page\"/, 'className="head-page projects-page"');
    code = code.replace(/className=\"user-main\"/, 'className="head-main"');

    fs.writeFileSync('c:/MyProject/my-app/src/Head/Process.js', code);
    console.log('Successfully written Head/Process.js');
} catch (e) {
    console.error(e);
}
