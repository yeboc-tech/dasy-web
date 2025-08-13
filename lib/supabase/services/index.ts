// Export base service functions
export * from './services';

// Export client-side functions
export { 
  getChapters, 
  getSubjects, 
  getChapterTree, 
  getChaptersBySubject 
} from './clientServices';

// Export server-side functions with different names to avoid conflicts
export { 
  getChapters as getChaptersServer, 
  getSubjects as getSubjectsServer, 
  getChapterTree as getChapterTreeServer, 
  getChaptersBySubject as getChaptersBySubjectServer 
} from './serverServices';
