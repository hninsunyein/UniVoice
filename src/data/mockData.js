export const users = [
  { id: 1, name: "Alice Johnson", email: "alice@university.edu", role: "student", faculty: "Computer Science", avatar: "AJ" },
  { id: 2, name: "Bob Smith", email: "bob@university.edu", role: "student", faculty: "Business", avatar: "BS" },
  { id: 3, name: "Carol Davis", email: "carol@university.edu", role: "student", faculty: "Engineering", avatar: "CD" },
  { id: 4, name: "David Wilson", email: "david@university.edu", role: "coordinator", faculty: "Computer Science", avatar: "DW" },
  { id: 5, name: "Eva Martinez", email: "eva@university.edu", role: "coordinator", faculty: "Business", avatar: "EM" },
  { id: 6, name: "Frank Brown", email: "frank@university.edu", role: "coordinator", faculty: "Engineering", avatar: "FB" },
  { id: 7, name: "Grace Lee", email: "grace@university.edu", role: "manager", faculty: null, avatar: "GL" },
  { id: 8, name: "Henry Taylor", email: "henry@university.edu", role: "admin", faculty: null, avatar: "HT" },
  { id: 9, name: "Ivy Chen", email: "ivy@university.edu", role: "guest", faculty: "Computer Science", avatar: "IC" },
  { id: 10, name: "Jake Turner", email: "jake@university.edu", role: "student", faculty: "Arts & Design", avatar: "JT" },
];

export const faculties = [
  { id: 1, name: "Computer Science", coordinator: "David Wilson", contributionCount: 12 },
  { id: 2, name: "Business", coordinator: "Eva Martinez", contributionCount: 8 },
  { id: 3, name: "Engineering", coordinator: "Frank Brown", contributionCount: 15 },
  { id: 4, name: "Arts & Design", coordinator: "Sarah Palmer", contributionCount: 6 },
  { id: 5, name: "Life Sciences", coordinator: "Tom Harris", contributionCount: 9 },
];

export const contributions = [
  { id: 1, title: "AI in Modern Education", studentId: 1, studentName: "Alice Johnson", faculty: "Computer Science", status: "selected", submittedDate: "2026-01-15", lastUpdated: "2026-02-01", hasImage: true, content: "Artificial intelligence is transforming the way we approach education, offering personalized learning experiences and automated assessment tools that adapt to individual student needs..." },
  { id: 2, title: "Sustainable Business Practices", studentId: 2, studentName: "Bob Smith", faculty: "Business", status: "submitted", submittedDate: "2026-02-10", lastUpdated: "2026-02-10", hasImage: false, content: "Modern businesses are increasingly adopting sustainable practices that balance profit with environmental responsibility..." },
  { id: 3, title: "Renewable Energy Solutions", studentId: 3, studentName: "Carol Davis", faculty: "Engineering", status: "selected", submittedDate: "2026-01-20", lastUpdated: "2026-01-28", hasImage: true, content: "The engineering community is at the forefront of developing renewable energy solutions that could transform our approach to power generation..." },
  { id: 4, title: "Machine Learning Trends", studentId: 1, studentName: "Alice Johnson", faculty: "Computer Science", status: "draft", submittedDate: "2026-02-14", lastUpdated: "2026-02-14", hasImage: false, content: "Machine learning continues to evolve rapidly with new architectures and training methodologies emerging every quarter..." },
  { id: 5, title: "Digital Marketing Strategy", studentId: 2, studentName: "Bob Smith", faculty: "Business", status: "rejected", submittedDate: "2026-01-05", lastUpdated: "2026-01-12", hasImage: true, content: "The landscape of digital marketing has shifted dramatically with the rise of AI-powered tools and privacy-first approaches..." },
  { id: 6, title: "Bridge Design Innovation", studentId: 3, studentName: "Carol Davis", faculty: "Engineering", status: "submitted", submittedDate: "2026-01-25", lastUpdated: "2026-01-25", hasImage: true, content: "Modern bridge engineering combines computational design with sustainable materials to create structures that are both beautiful and resilient..." },
  { id: 7, title: "Campus Life Photo Essay", studentId: 10, studentName: "Jake Turner", faculty: "Arts & Design", status: "selected", submittedDate: "2026-01-18", lastUpdated: "2026-02-02", hasImage: true, content: "A visual journey through the vibrant campus life at our university, capturing moments of creativity, collaboration, and community..." },
  { id: 8, title: "Cybersecurity Best Practices", studentId: 1, studentName: "Alice Johnson", faculty: "Computer Science", status: "submitted", submittedDate: "2026-02-01", lastUpdated: "2026-02-01", hasImage: false, content: "As cyber threats become increasingly sophisticated, understanding and implementing best practices in cybersecurity is essential for every organization..." },
  { id: 9, title: "Startup Ecosystem Analysis", studentId: 2, studentName: "Bob Smith", faculty: "Business", status: "selected", submittedDate: "2026-01-10", lastUpdated: "2026-01-22", hasImage: false, content: "The university startup ecosystem has grown remarkably, with student-led ventures securing funding and making real-world impact..." },
  { id: 10, title: "Smart City Infrastructure", studentId: 3, studentName: "Carol Davis", faculty: "Engineering", status: "submitted", submittedDate: "2026-01-30", lastUpdated: "2026-01-30", hasImage: true, content: "Smart city initiatives are reshaping urban infrastructure, integrating IoT sensors, AI-driven traffic management, and sustainable energy grids..." },
];

export const comments = [
  { id: 1, contributionId: 1, coordinatorName: "David Wilson", text: "Excellent article! Well-researched and engaging.", date: "2026-01-20" },
  { id: 2, contributionId: 3, coordinatorName: "Frank Brown", text: "Great technical depth. Selected for the magazine.", date: "2026-01-28" },
  { id: 3, contributionId: 5, coordinatorName: "Eva Martinez", text: "Topic doesn't align with this year's theme. Please revise.", date: "2026-01-12" },
  { id: 4, contributionId: 7, coordinatorName: "Sarah Palmer", text: "Beautiful photography! Perfect for the arts section.", date: "2026-02-02" },
  { id: 5, contributionId: 9, coordinatorName: "Eva Martinez", text: "Insightful analysis. Selected for publication.", date: "2026-01-22" },
];

export const deadlines = {
  submissionClosure: "2026-03-15T23:59:59",
  finalClosure: "2026-04-10T23:59:59",
  academicYear: "2025-2026",
};

export const notifications = [
  { id: 1, message: "Email sent to David Wilson (Coordinator) about new submission.", time: "2 hours ago" },
  { id: 2, message: "Guest account created for Ivy Chen. Email sent.", time: "1 day ago" },
  { id: 3, message: "Reminder: Submission deadline is March 15, 2026.", time: "3 days ago" },
];

export const stats = {
  totalSubmissions: 10,
  totalUsers: 10,
  pendingReviews: 4,
  selectedArticles: 4,
  totalFaculties: 5,
};

export const exceptionsReport = [
  { coordinatorName: "Sarah Palmer", faculty: "Arts & Design", pendingCount: 2, oldestPending: "2026-01-30", daysOverdue: 18 },
  { coordinatorName: "Tom Harris", faculty: "Life Sciences", pendingCount: 3, oldestPending: "2026-01-28", daysOverdue: 20 },
];

export const mostActiveUsers = [
  { name: "Alice Johnson", faculty: "Computer Science", submissions: 3 },
  { name: "Bob Smith", faculty: "Business", submissions: 3 },
  { name: "Carol Davis", faculty: "Engineering", submissions: 3 },
  { name: "Jake Turner", faculty: "Arts & Design", submissions: 1 },
];
