import React from 'react';

export default function CourseCards({ students, selectedCourse, onSelectCourse }) {
  // Aggregate count by course
  const courseCounts = students.reduce((acc, student) => {
    const course = student.course || 'Unknown';
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {});

  const courses = Object.keys(courseCounts).sort();

  return (
    <div className="course-cards-grid">
      {/* Total Students Card */}
      <div
        className={`course-card ${!selectedCourse ? 'active' : ''}`}
        onClick={() => onSelectCourse(null)}
        title="View all students"
      >
        <span className="course-card-title">All Students</span>
        <span className="course-card-count">{students.length}</span>
        <span className="course-card-sub">Total Enrolled</span>
      </div>

      {/* Individual Course Cards */}
      {courses.map((course) => {
        const count = courseCounts[course];
        const isSelected = selectedCourse === course;
        return (
          <div
            key={course}
            className={`course-card ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectCourse(isSelected ? null : course)}
            title={`Filter by ${course}`}
          >
            <span className="course-card-title">{course}</span>
            <span className="course-card-count">{count}</span>
            <span className="course-card-sub">
              {count === 1 ? '1 Student' : `${count} Students`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
