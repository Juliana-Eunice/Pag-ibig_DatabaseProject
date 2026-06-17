package com.pagibig;

public class PreviousEmploymentRecord {
    private String pagibigId;
    private String employerId;
    private String dateFrom;
    private String dateTo;
    private String prevOfficeAssignment;

    public PreviousEmploymentRecord(String pagibigId, String employerId, String dateFrom, String dateTo, String prevOfficeAssignment) {
        this.pagibigId = pagibigId;
        this.employerId = employerId;
        this.dateFrom = dateFrom;
        this.dateTo = dateTo;
        this.prevOfficeAssignment = prevOfficeAssignment;
    }

    public String getPagibigId() {
        return pagibigId;
    }

    public void setPagibigId(String pagibigId) {
        this.pagibigId = pagibigId;
    }

    public String getEmployerId() {
        return employerId;
    }

    public void setEmployerId(String employerId) {
        this.employerId = employerId;
    }

    public String getDateFrom() {
        return dateFrom;
    }

    public void setDateFrom(String dateFrom) {
        this.dateFrom = dateFrom;
    }

    public String getDateTo() {
        return dateTo;
    }

    public void setDateTo(String dateTo) {
        this.dateTo = dateTo;
    }

    public String getPrevOfficeAssignment() {
        return prevOfficeAssignment;
    }

    public void setPrevOfficeAssignment(String prevOfficeAssignment) {
        this.prevOfficeAssignment = prevOfficeAssignment;
    }
}
