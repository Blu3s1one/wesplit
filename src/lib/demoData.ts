import { db } from '../db';

/**
 * Creates a demo "Classroom" session with 30 students
 */
export async function createDemoClassroom(): Promise<string> {
  // Create the session
  const sessionId = await db.addSession({
    name: 'Classroom Demo',
    elementLabel: 'student',
    colorTheme: 'basic',
  });

  // Create attributes
  const genderAttrId = await db.addAttribute({
    sessionId,
    name: 'Gender',
    type: 'enum',
    required: true,
    options: ['Boy', 'Girl'],
  });

  const ageAttrId = await db.addAttribute({
    sessionId,
    name: 'Age',
    type: 'number',
    required: true,
    min: 12,
    max: 14,
  });

  const disruptiveAttrId = await db.addAttribute({
    sessionId,
    name: 'Disruptive',
    type: 'repulsive',
    required: false,
  });

  // Define student data
  const studentNames = [
    // Boys (14)
    'Liam Johnson',
    'Noah Williams',
    'Oliver Brown',
    'Elijah Davis',
    'James Miller',
    'William Wilson',
    'Benjamin Moore',
    'Lucas Taylor',
    'Henry Anderson',
    'Alexander Thomas',
    'Mason Jackson',
    'Michael White',
    'Ethan Harris',
    'Daniel Martin',
    // Girls (16)
    'Emma Thompson',
    'Olivia Garcia',
    'Ava Martinez',
    'Isabella Rodriguez',
    'Sophia Hernandez',
    'Charlotte Lopez',
    'Mia Gonzalez',
    'Amelia Wilson',
    'Harper Lee',
    'Evelyn Clark',
    'Abigail Lewis',
    'Emily Robinson',
    'Elizabeth Walker',
    'Mila Hall',
    'Ella Allen',
    'Avery Young',
  ];

  // Boys: first 14, Girls: last 16
  const genders = [...Array(14).fill('Boy'), ...Array(16).fill('Girl')];

  // Random ages between 12-14
  const ages = [
    13,
    12,
    14,
    13,
    13,
    12,
    14,
    13,
    12,
    13,
    14,
    13,
    12,
    13, // Boys
    13,
    14,
    12,
    13,
    14,
    13,
    12,
    14,
    13,
    12,
    13,
    14,
    13,
    12,
    13,
    14, // Girls
  ];

  // Some students are disruptive (indices: 2, 5, 9, 15, 22, 27)
  const disruptiveStudents = [2, 5, 9, 15, 22, 27];

  // Create students
  for (let i = 0; i < studentNames.length; i++) {
    const attributes: Record<string, string | number | boolean> = {
      [genderAttrId]: genders[i],
      [ageAttrId]: ages[i],
    };

    // Add disruptive attribute if applicable
    if (disruptiveStudents.includes(i)) {
      attributes[disruptiveAttrId] = true;
    }

    await db.addElement({
      sessionId,
      name: studentNames[i],
      attributes,
    });
  }

  return sessionId;
}
