const fs = require('fs');
let code = fs.readFileSync('c:/MyProject/my-app/src/Head/Announcements.js', 'utf8');

// The file already has the sidebar injected from the previous run
// So we just need to replace the double `navigate` declaration
code = code.replace("  const navigate = useNavigate();\n  const goOverview = () => navigate('/User');", "  const goOverview = () => navigate('/head');");

fs.writeFileSync('c:/MyProject/my-app/src/Head/Announcements.js', code);
console.log('Fixed Head/Announcements.js');
