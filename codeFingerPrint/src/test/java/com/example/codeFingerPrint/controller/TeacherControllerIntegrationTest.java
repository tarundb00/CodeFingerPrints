package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.AddTeacher;
import com.example.codeFingerPrint.repository.AddTeacherRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class TeacherControllerIntegrationTest {

  @Autowired
  private AddTeacherRepository addTeacherRepository;

  @Test
  @Transactional
  void shouldCreateAndListTeachers() {
    addTeacherRepository.deleteAll();

    AddTeacher teacher = new AddTeacher();
    teacher.setFirstName("Ava");
    teacher.setLastName("Lee");
    teacher.setEmail("ava@example.com");
    teacher.setPassword("secret");
    teacher.setPhone("+91 99999 11111");
    teacher.setDateOfBirth(LocalDate.of(1990, 1, 1));
    teacher.setGender("female");
    teacher.setAddress("Test address");

    addTeacherRepository.save(teacher);

    List<AddTeacher> teachers = addTeacherRepository.findAll();

    assertThat(teachers).hasSize(1);
    assertThat(teachers.get(0).getEmail()).isEqualTo("ava@example.com");
  }
}
