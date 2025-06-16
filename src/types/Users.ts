export interface Family {
    familyname: string;
    familyID: string;
    users: User[];
  }
  
  export interface User {
    username: string;
    email: string;
    familyID: string;
    userID: string;
  }
  
  
