package com.example.codeFingerPrint.security;

import com.example.codeFingerPrint.entity.AddTeacher;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class UserDetailsImpl implements UserDetails {

  private final Long id;
  private final String email;
  private final String password;
  private final String firstName;
  private final String lastName;
  private final String profilePictureUrl;
  private final Collection<? extends GrantedAuthority> authorities;

  public UserDetailsImpl(Long id, String email, String password,
      String firstName, String lastName, String profilePictureUrl,
      Collection<? extends GrantedAuthority> authorities) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
    this.profilePictureUrl = profilePictureUrl;
    this.authorities = authorities;
  }

  public static UserDetailsImpl build(AddTeacher teacher) {
    List<GrantedAuthority> authorities = teacher.getRoles().stream()
        .map(role -> {
          String normalized = role == null ? "" : role.trim().toUpperCase();
          if (!normalized.startsWith("ROLE_"))
            normalized = "ROLE_" + normalized;
          return new SimpleGrantedAuthority(normalized);
        })
        .collect(Collectors.toList());
    return new UserDetailsImpl(
        teacher.getId(), teacher.getEmail(), teacher.getPassword(),
        teacher.getFirstName(), teacher.getLastName(), teacher.getProfilePictureUrl(),
        authorities);
  }

  public Long getId() {
    return id;
  }

  public String getFirstName() {
    return firstName;
  }

  public String getLastName() {
    return lastName;
  }

  public String getProfilePictureUrl() {
    return profilePictureUrl;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return authorities;
  }

  @Override
  public String getPassword() {
    return password;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o)
      return true;
    if (!(o instanceof UserDetailsImpl))
      return false;
    return Objects.equals(id, ((UserDetailsImpl) o).id);
  }
}
