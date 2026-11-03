package com.example.codeFingerPrint.security;

import com.example.codeFingerPrint.entity.Admin;
import com.example.codeFingerPrint.entity.AddTeacher;
import com.example.codeFingerPrint.repository.AdminRepository;
import com.example.codeFingerPrint.repository.AddTeacherRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

  private final AdminRepository adminRepository;
  private final AddTeacherRepository teacherRepository;

  public UserDetailsServiceImpl(AdminRepository adminRepository,
                                AddTeacherRepository teacherRepository) {
    this.adminRepository = adminRepository;
    this.teacherRepository = teacherRepository;
  }

  @Override
  @Transactional
  public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

    // 1. Check admins table first
    Admin admin = adminRepository.findByEmail(email).orElse(null);
    if (admin != null) {
      return new UserDetailsImpl(
          admin.getId(), admin.getEmail(), admin.getPassword(),
          admin.getFirstName(), admin.getLastName(), admin.getProfilePictureUrl(),
          List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
      );
    }

    // 2. Fall back to teachers/users table
    AddTeacher teacher = teacherRepository.findByEmail(email)
        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

    return UserDetailsImpl.build(teacher);
  }
}
